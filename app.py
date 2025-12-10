"""
TechStore Customer Support Chatbot
Uses OpenAI Agents SDK with MCP Streamable HTTP
"""

import asyncio
import os
import re
import gradio as gr
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp

# Load .env file if present
from pathlib import Path
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())

# Configuration
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "https://vipfapwm3x.us-east-1.awsapprunner.com/mcp")

BASE_INSTRUCTIONS = """You are a helpful customer support agent for TechStore, a computer products retailer.

We sell:
- Computers (COM-xxxx): Desktops, laptops, gaming PCs, workstations, MacBooks, Chromebooks
- Monitors (MON-xxxx): 24"/27"/32", 4K, ultrawide, curved, portable, touch
- Printers (PRI-xxxx): Laser, inkjet, photo, 3D, large format
- Accessories (ACC-xxxx): Keyboards, mice, webcams, headsets, docking stations
- Networking (NET-xxxx): Routers, switches, access points, modems

Guidelines:
1. Be friendly and helpful
2. Use search_products for keyword queries, list_products for browsing categories
3. When showing products, include SKU, name, price, and stock
4. For order-related requests (viewing orders, placing orders), customers must be verified first using verify_customer_pin
5. After verification succeeds, use the customer_id from the response for list_orders or create_order
6. For creating orders, get the product details first to confirm the unit_price
"""


def get_instructions(customer_state: dict) -> str:
    """Build instructions with customer state"""
    if customer_state.get("verified"):
        return BASE_INSTRUCTIONS + f"""

IMPORTANT - VERIFIED CUSTOMER SESSION:
The customer has already been verified. DO NOT ask for verification again.
- Customer Name: {customer_state.get('name')}
- Customer ID: {customer_state.get('customer_id')}

Use this customer_id directly for list_orders and create_order calls. The customer is already authenticated.
"""
    return BASE_INSTRUCTIONS


async def chat_async(message: str, history: list, customer_state: dict) -> tuple[str, dict]:
    """Process chat message using OpenAI Agents SDK"""

    # Create fresh MCP connection for each request
    async with MCPServerStreamableHttp(params={"url": MCP_SERVER_URL, "timeout": 30}) as mcp_server:
        # Build instructions with customer state
        instructions = get_instructions(customer_state)

        agent = Agent(
            name="TechStore Support",
            instructions=instructions,
            model="gpt-4o-mini",
            mcp_servers=[mcp_server]
        )

        # Run the agent
        result = await Runner.run(agent, message)

        # Extract response text
        response_text = result.final_output if hasattr(result, 'final_output') else str(result)

        # Check if verification happened in this response (look for Customer ID in tool output)
        if not customer_state.get("verified"):
            id_match = re.search(r'Customer ID[:\s]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', response_text)
            name_match = re.search(r'verified[:\s]+([A-Za-z\s]+?)(?:\n|Customer)', response_text)
            if id_match:
                customer_state = {
                    "verified": True,
                    "customer_id": id_match.group(1),
                    "name": name_match.group(1).strip() if name_match else "Customer",
                }

        return response_text, customer_state


def chat(message: str, history: list, customer_state: dict) -> tuple[str, dict]:
    """Sync wrapper for async chat"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(chat_async(message, history, customer_state))
    finally:
        loop.close()


# Gradio UI
with gr.Blocks(title="TechStore Support") as demo:
    gr.Markdown("""
    # TechStore Customer Support

    I can help you with:
    - **Browse products** by category or search
    - **Check prices and stock**
    - **View your orders** (requires email + PIN verification)
    - **Place new orders** (requires verification)

    *Try: "Show me gaming laptops" or "I want to check my orders"*
    """)

    customer_state = gr.State(value={})
    chatbot = gr.Chatbot(height=450)
    msg = gr.Textbox(placeholder="Ask me anything about our products...", show_label=False)

    with gr.Row():
        clear = gr.Button("Clear Chat")

    status = gr.Markdown("*Not logged in*")

    def respond(message, history, cust_state):
        reply, new_state = chat(message, history, cust_state)
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": reply})

        if new_state.get("verified"):
            status_text = f"**Logged in as:** {new_state.get('name')} (ID: {new_state.get('customer_id', '')[:8]}...)"
        else:
            status_text = "*Not logged in*"

        return "", history, new_state, status_text

    def clear_chat():
        return [], {}, "*Not logged in*"

    msg.submit(respond, [msg, chatbot, customer_state], [msg, chatbot, customer_state, status])
    clear.click(clear_chat, None, [chatbot, customer_state, status])

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)

# TechStore Customer Support

An AI-powered customer support chatbot for TechStore, a computer products retailer. Built with OpenAI Agents SDK and MCP (Model Context Protocol) for tool integration.

## Features

- **Product Browsing**: Search and browse products by category (computers, monitors, printers, accessories, networking)
- **Order Management**: View orders and place new orders (requires customer verification)
- **Customer Verification**: Secure PIN-based authentication for order-related operations
- **Prompt Injection Protection**: Built-in guardrails against common prompt injection attacks

## Architecture

- **Backend API**: FastAPI server using OpenAI Agents SDK with MCP Streamable HTTP
- **Frontend**: Next.js 16 with React 19, Tailwind CSS, and streaming chat UI
- **Alternative UI**: Gradio-based interface for quick testing

## Tech Stack

### Backend
- Python 3.12+
- FastAPI
- OpenAI Agents SDK
- MCP (Model Context Protocol)

### Frontend
- Next.js 16
- React 19
- Tailwind CSS
- Vercel AI SDK

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- OpenAI API key

### Backend Setup

1. Install dependencies:
   ```bash
   pip install -e .
   ```

2. Create a `.env` file:
   ```
   OPENAI_API_KEY=your_api_key
   MCP_SERVER_URL=your_mcp_server_url
   ```

3. Run the API server:
   ```bash
   uvicorn api:app --reload --port 8000
   ```

   Or run the Gradio interface:
   ```bash
   pip install -e ".[gradio]"
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

- `POST /chat` - Send a message and receive a streaming response
- `POST /feedback` - Submit feedback for a conversation
- `POST /evaluate` - Run evaluation on a conversation
- `GET /evaluations` - Get evaluation results

## Product Categories

| Category | SKU Prefix | Examples |
|----------|------------|----------|
| Computers | COM-xxxx | Desktops, laptops, gaming PCs, workstations |
| Monitors | MON-xxxx | 4K, ultrawide, curved, portable |
| Printers | PRI-xxxx | Laser, inkjet, photo, 3D |
| Accessories | ACC-xxxx | Keyboards, mice, webcams, headsets |
| Networking | NET-xxxx | Routers, switches, access points |

## License

MIT

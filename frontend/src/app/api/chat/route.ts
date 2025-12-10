import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const { messages, customerState = {} } = await req.json();

    // Get the last user message and history
    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop();

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }

    // Get history (all messages except the last user message)
    const history = messages.slice(0, -1);

    // Call the FastAPI backend
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: lastUserMessage.content,
        history: history,
        customer_state: customerState,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", errorText);
      return NextResponse.json(
        { error: "Failed to get response from support agent" },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      message: data.message,
      conversationId: data.conversation_id,
      customerState: data.customer_state,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

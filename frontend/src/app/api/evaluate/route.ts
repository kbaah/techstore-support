import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${API_URL}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: body.conversationId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evaluate API error:", errorText);
      return NextResponse.json(
        { error: "Failed to run evaluation" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluate error:", error);
    return NextResponse.json(
      { error: "Failed to run evaluation" },
      { status: 500 }
    );
  }
}

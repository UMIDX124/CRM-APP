import { NextRequest, NextResponse } from "next/server";
import { claudeClient } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const response = await claudeClient.chat(messages, context);

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("Claude API Error:", error);
    return NextResponse.json(
      { error: error.message || "AI processing failed" },
      { status: 500 }
    );
  }
}

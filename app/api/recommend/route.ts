import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a flashcard deck advisor. Given a description of what the user wants to study, recommend the ideal number of flashcards.

Consider the topic's breadth and depth, and the user's stated goal.

Return ONLY valid JSON in this exact format, with no other text:
{"count": 15, "reasoning": "A single sentence explaining your recommendation."}

Guidelines:
- Fun quiz or casual use: 5–10 cards
- Quick revision or overview: 10–15 cards
- Learning in depth: 15–25 cards
- Comprehensive study of a broad topic: 25–50 cards`;

export async function POST(req: NextRequest) {
  let description: string;

  try {
    const body = await req.json();
    description = body.description;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!description || typeof description !== "string") {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    const parsed = JSON.parse(content.text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to reach Claude API" }, { status: 500 });
  }
}

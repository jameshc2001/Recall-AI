import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a flashcard deck creation assistant. Your job is to gather information from the user and then generate a flashcard deck.

PHASE 1 — GATHER (ask one question at a time, in this order):
  1. Ask what topic or subject the user wants to study.
  2. Ask what difficulty level they prefer: beginner, intermediate, or advanced.
  3. Ask how many cards they want (suggest a range of 5–20).

Be conversational and brief. Ask only one question per turn.

PHASE 2 — CONFIRM:
Once you have all three pieces of information, briefly summarize (topic, difficulty, number of cards) and ask the user to confirm before generating.

PHASE 3 — GENERATE:
After the user confirms, respond with exactly one short sentence like "Here is your deck!" followed immediately by a JSON code block in this exact format:

\`\`\`json
{
  "title": "...",
  "topic": "...",
  "cards": [
    { "id": "1", "question": "...", "answer": "..." }
  ]
}
\`\`\`

Do not include any text after the JSON block.`;

export async function POST(req: NextRequest) {
  let messages: { role: "user" | "assistant"; content: string }[];

  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    return NextResponse.json({ role: "assistant", content: content.text });
  } catch {
    return NextResponse.json({ error: "Failed to reach Claude API" }, { status: 500 });
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a flashcard deck generator. The user will provide a description of the deck they want and the exact number of cards to generate.

Generate exactly the requested number of flashcard question/answer pairs on the described topic at the described difficulty level.

Respond with exactly one short sentence like "Here is your deck!" followed immediately by a JSON code block in this exact format:

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
  let description: string;
  let count: number;

  try {
    const body = await req.json();
    description = body.description;
    count = body.count;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!description || typeof description !== "string") {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  if (!count || typeof count !== "number") {
    return NextResponse.json({ error: "count is required" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `${description}\n\nGenerate exactly ${count} cards.` },
      ],
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

import { NextRequest, NextResponse } from "next/server";
import { Deck } from "@/lib/types";
import {
  getDecks,
  saveOrUpdateDeck,
  deleteDeck,
} from "@/lib/serverStorage";

export async function GET() {
  const decks = await getDecks();
  return NextResponse.json({ decks });
}

export async function POST(request: NextRequest) {
  let deck: Deck;
  try {
    const body = await request.json();
    deck = body.deck;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!deck || typeof deck.id !== "string") {
    return NextResponse.json({ error: "deck is required" }, { status: 400 });
  }
  await saveOrUpdateDeck(deck);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await deleteDeck(id);
  return NextResponse.json({ ok: true });
}

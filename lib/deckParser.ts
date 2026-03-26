import { Deck, Card } from "./types";

export function parseDeckFromMessage(content: string): Deck | null {
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1].trim());
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).title !== "string" ||
    typeof (parsed as Record<string, unknown>).topic !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>).cards) ||
    (parsed as { cards: unknown[] }).cards.length === 0
  ) {
    return null;
  }

  const raw = parsed as { title: string; topic: string; cards: unknown[] };

  const cards: Card[] = [];
  for (const c of raw.cards) {
    if (
      typeof c !== "object" ||
      c === null ||
      typeof (c as Record<string, unknown>).id !== "string" ||
      typeof (c as Record<string, unknown>).question !== "string" ||
      typeof (c as Record<string, unknown>).answer !== "string"
    ) {
      return null;
    }
    const card = c as Card;
    if (!card.id || !card.question || !card.answer) return null;
    cards.push(card);
  }

  return {
    id: crypto.randomUUID(),
    title: raw.title,
    topic: raw.topic,
    createdAt: new Date().toISOString(),
    cards,
  };
}

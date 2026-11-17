import { Deck, Card } from "./types";

/** Upper bound on cards added by a single "Expand deck" request. */
export const MAX_NEW_CARDS = 50;

/** Extracts and parses the first fenced (```json or ```) block. Returns undefined on failure. */
function extractFencedJson(content: string): unknown {
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!match) return undefined;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return undefined;
  }
}

/**
 * Parses the new cards returned by /api/expand. Every card gets a fresh UUID —
 * existing decks use short ids like "1", "2", so ids from Claude would collide.
 */
export function parseNewCardsFromMessage(content: string): Card[] | null {
  const parsed = extractFencedJson(content);
  if (typeof parsed !== "object" || parsed === null) return null;
  const raw = (parsed as Record<string, unknown>).cards;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_NEW_CARDS) return null;

  const cards: Card[] = [];
  for (const c of raw) {
    if (typeof c !== "object" || c === null) return null;
    const { question, answer } = c as Record<string, unknown>;
    if (typeof question !== "string" || typeof answer !== "string") return null;
    if (!question.trim() || !answer.trim()) return null;
    cards.push({ id: crypto.randomUUID(), question, answer });
  }
  return cards;
}

export function parseDeckFromMessage(content: string): Deck | null {
  const parsed = extractFencedJson(content);
  if (parsed === undefined) return null;

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

import "server-only";
import { Redis } from "@upstash/redis";
import { Deck } from "./types";
import { PracticeSession } from "./storage";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DECKS_KEY = "decks";

export async function getDecks(): Promise<Deck[]> {
  const decks = await redis.get<Deck[]>(DECKS_KEY);
  return decks ?? [];
}

export async function saveOrUpdateDeck(deck: Deck): Promise<void> {
  const decks = await getDecks();
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) {
    decks[idx] = deck;
  } else {
    decks.push(deck);
  }
  await redis.set(DECKS_KEY, decks);
}

export async function deleteDeck(id: string): Promise<void> {
  const decks = await getDecks();
  await redis.set(DECKS_KEY, decks.filter((d) => d.id !== id));
}

export async function getSession(deckId: string): Promise<PracticeSession | null> {
  return redis.get<PracticeSession>(`session:${deckId}`);
}

export async function saveSession(deckId: string, session: PracticeSession): Promise<void> {
  await redis.set(`session:${deckId}`, session);
}

export async function clearSession(deckId: string): Promise<void> {
  await redis.del(`session:${deckId}`);
}

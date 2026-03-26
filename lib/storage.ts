import { Deck } from "./types";

const STORAGE_KEY = "recall_decks";

export function getDecks(): Deck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Deck[]) : [];
  } catch {
    return [];
  }
}

export function getDeckById(id: string): Deck | null {
  return getDecks().find((d) => d.id === id) ?? null;
}

export function saveDeck(deck: Deck): void {
  if (typeof window === "undefined") return;
  try {
    const decks = getDecks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...decks, deck]));
  } catch {
    // quota exceeded or storage unavailable — fail silently
  }
}

export function deleteDeck(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const decks = getDecks().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // fail silently
  }
}

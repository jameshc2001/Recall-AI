import { Deck } from "./types";

const STORAGE_KEY = "recall_decks";

export interface PracticeSession {
  currentIndex: number;
  results: Array<"correct" | "incorrect">;
  cardOrder: string[];
}

function sessionKey(deckId: string) {
  return `recall_session_${deckId}`;
}

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

export function updateDeck(deck: Deck): void {
  if (typeof window === "undefined") return;
  try {
    const decks = getDecks().map((d) => (d.id === deck.id ? deck : d));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // fail silently
  }
}

export function getSession(deckId: string): PracticeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(sessionKey(deckId));
    return raw ? (JSON.parse(raw) as PracticeSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(deckId: string, session: PracticeSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(sessionKey(deckId), JSON.stringify(session));
  } catch {
    // fail silently
  }
}

export function clearSession(deckId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(sessionKey(deckId));
  } catch {
    // fail silently
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

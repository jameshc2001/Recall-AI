// Storage functions used by pages. Each function fetches /api/store/* on the server,
// which reads/writes Upstash Redis. This keeps data in sync across devices.
import { Deck } from "./types";
import { PracticeSession } from "./storage";

export async function getDecks(): Promise<Deck[]> {
  const res = await fetch("/api/store/decks");
  const data = await res.json();
  return data.decks ?? [];
}

export async function getDeckById(id: string): Promise<Deck | null> {
  const decks = await getDecks();
  return decks.find((d) => d.id === id) ?? null;
}

export async function saveDeck(deck: Deck): Promise<void> {
  await fetch("/api/store/decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck }),
  });
}

// updateDeck is an upsert — same operation as saveDeck
export async function updateDeck(deck: Deck): Promise<void> {
  return saveDeck(deck);
}

export async function deleteDeck(id: string): Promise<void> {
  await fetch(`/api/store/decks?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getSession(deckId: string): Promise<PracticeSession | null> {
  const res = await fetch(`/api/store/sessions/${encodeURIComponent(deckId)}`);
  const data = await res.json();
  return data.session ?? null;
}

export async function saveSession(
  deckId: string,
  session: PracticeSession
): Promise<void> {
  await fetch(`/api/store/sessions/${encodeURIComponent(deckId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
}

export async function clearSession(deckId: string): Promise<void> {
  await fetch(`/api/store/sessions/${encodeURIComponent(deckId)}`, {
    method: "DELETE",
  });
}

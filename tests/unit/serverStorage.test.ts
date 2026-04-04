import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Deck } from "@/lib/types";
import type { PracticeSession } from "@/lib/storage";

// --- Mock @upstash/redis before importing serverStorage ---
const store: Record<string, unknown> = {};

class MockRedis {
  async get(key: string) { return store[key] ?? null; }
  async set(key: string, value: unknown) { store[key] = value; }
  async del(key: string) { delete store[key]; }
}

vi.mock("@upstash/redis", () => ({ Redis: MockRedis }));

// Import after mock is set up
const { getDecks, saveOrUpdateDeck, deleteDeck, getSession, saveSession, clearSession } =
  await import("@/lib/serverStorage");

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-1",
    title: "Test Deck",
    topic: "Testing",
    createdAt: "2026-01-01T00:00:00.000Z",
    cards: [{ id: "c1", question: "Q?", answer: "A." }],
    ...overrides,
  };
}

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    currentIndex: 0,
    results: [],
    cardOrder: ["c1"],
    ...overrides,
  };
}

beforeEach(() => {
  // Clear the in-memory store between tests
  for (const key of Object.keys(store)) delete store[key];
});

describe("serverStorage — decks", () => {
  it("returns empty array when no decks stored", async () => {
    expect(await getDecks()).toEqual([]);
  });

  it("saves a new deck and retrieves it", async () => {
    const deck = makeDeck();
    await saveOrUpdateDeck(deck);
    expect(await getDecks()).toEqual([deck]);
  });

  it("updates an existing deck (same id)", async () => {
    const deck = makeDeck();
    await saveOrUpdateDeck(deck);
    const updated = { ...deck, title: "Updated Title" };
    await saveOrUpdateDeck(updated);
    const decks = await getDecks();
    expect(decks).toHaveLength(1);
    expect(decks[0].title).toBe("Updated Title");
  });

  it("saves multiple decks independently", async () => {
    await saveOrUpdateDeck(makeDeck({ id: "a" }));
    await saveOrUpdateDeck(makeDeck({ id: "b" }));
    expect(await getDecks()).toHaveLength(2);
  });

  it("deletes a deck by id", async () => {
    await saveOrUpdateDeck(makeDeck({ id: "a" }));
    await saveOrUpdateDeck(makeDeck({ id: "b" }));
    await deleteDeck("a");
    const decks = await getDecks();
    expect(decks).toHaveLength(1);
    expect(decks[0].id).toBe("b");
  });

  it("deleteDeck is a no-op when id does not exist", async () => {
    await saveOrUpdateDeck(makeDeck({ id: "a" }));
    await deleteDeck("nonexistent");
    expect(await getDecks()).toHaveLength(1);
  });
});

describe("serverStorage — sessions", () => {
  it("returns null when no session stored", async () => {
    expect(await getSession("deck-1")).toBeNull();
  });

  it("saves and retrieves a session", async () => {
    const session = makeSession({ currentIndex: 2, results: ["correct", "incorrect"] });
    await saveSession("deck-1", session);
    expect(await getSession("deck-1")).toEqual(session);
  });

  it("overwrites an existing session", async () => {
    await saveSession("deck-1", makeSession({ currentIndex: 0 }));
    await saveSession("deck-1", makeSession({ currentIndex: 3 }));
    const s = await getSession("deck-1");
    expect(s?.currentIndex).toBe(3);
  });

  it("clears a session", async () => {
    await saveSession("deck-1", makeSession());
    await clearSession("deck-1");
    expect(await getSession("deck-1")).toBeNull();
  });

  it("sessions are scoped by deckId", async () => {
    await saveSession("deck-a", makeSession({ currentIndex: 1 }));
    await saveSession("deck-b", makeSession({ currentIndex: 5 }));
    expect((await getSession("deck-a"))?.currentIndex).toBe(1);
    expect((await getSession("deck-b"))?.currentIndex).toBe(5);
  });
});

import { describe, it, expect, vi } from "vitest";
import { getDecks, getDeckById, saveDeck, deleteDeck } from "@/lib/storage";
import type { Deck } from "@/lib/types";

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

describe("storage", () => {
  describe("getDecks", () => {
    it("returns an empty array when storage is empty", () => {
      expect(getDecks()).toEqual([]);
    });

    it("returns parsed decks when storage has data", () => {
      const deck = makeDeck();
      localStorage.setItem("recall_decks", JSON.stringify([deck]));
      expect(getDecks()).toEqual([deck]);
    });

    it("returns an empty array when localStorage contains invalid JSON", () => {
      localStorage.setItem("recall_decks", "not-json");
      expect(getDecks()).toEqual([]);
    });
  });

  describe("getDeckById", () => {
    it("returns the matching deck", () => {
      const deck = makeDeck({ id: "abc" });
      localStorage.setItem("recall_decks", JSON.stringify([deck]));
      expect(getDeckById("abc")).toEqual(deck);
    });

    it("returns null when deck does not exist", () => {
      expect(getDeckById("nonexistent")).toBeNull();
    });
  });

  describe("saveDeck", () => {
    it("persists a deck to localStorage", () => {
      const deck = makeDeck();
      saveDeck(deck);
      expect(getDecks()).toEqual([deck]);
    });

    it("appends to existing decks", () => {
      const deck1 = makeDeck({ id: "1" });
      const deck2 = makeDeck({ id: "2" });
      saveDeck(deck1);
      saveDeck(deck2);
      expect(getDecks()).toHaveLength(2);
    });

    it("does not throw when localStorage.setItem throws", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      expect(() => saveDeck(makeDeck())).not.toThrow();
    });
  });

  describe("deleteDeck", () => {
    it("removes the deck with the given id", () => {
      const deck1 = makeDeck({ id: "1" });
      const deck2 = makeDeck({ id: "2" });
      saveDeck(deck1);
      saveDeck(deck2);
      deleteDeck("1");
      const remaining = getDecks();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("2");
    });

    it("is a no-op when the id does not exist", () => {
      const deck = makeDeck({ id: "1" });
      saveDeck(deck);
      deleteDeck("nonexistent");
      expect(getDecks()).toHaveLength(1);
    });

    it("does not throw when localStorage.setItem throws", () => {
      saveDeck(makeDeck({ id: "1" }));
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      expect(() => deleteDeck("1")).not.toThrow();
    });
  });
});

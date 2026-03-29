import { describe, it, expect, vi } from "vitest";
import { getDecks, getDeckById, saveDeck, deleteDeck, updateDeck, getSession, saveSession, clearSession } from "@/lib/storage";
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

  describe("updateDeck", () => {
    it("replaces the matching deck in storage", () => {
      const deck = makeDeck({ id: "1", title: "Original" });
      saveDeck(deck);
      updateDeck({ ...deck, title: "Updated" });
      expect(getDeckById("1")?.title).toBe("Updated");
    });

    it("persists note field round-trip", () => {
      const deck = makeDeck({ id: "1" });
      saveDeck(deck);
      const updatedCards = [{ ...deck.cards[0], note: "## Hello" }];
      updateDeck({ ...deck, cards: updatedCards });
      expect(getDeckById("1")?.cards[0].note).toBe("## Hello");
    });

    it("does not affect other decks", () => {
      const deck1 = makeDeck({ id: "1", title: "Deck 1" });
      const deck2 = makeDeck({ id: "2", title: "Deck 2" });
      saveDeck(deck1);
      saveDeck(deck2);
      updateDeck({ ...deck1, title: "Deck 1 Updated" });
      expect(getDeckById("2")?.title).toBe("Deck 2");
    });

    it("is a no-op when the id does not exist (does not append)", () => {
      const deck = makeDeck({ id: "1" });
      saveDeck(deck);
      updateDeck(makeDeck({ id: "nonexistent" }));
      expect(getDecks()).toHaveLength(1);
    });

    it("does not throw when localStorage.setItem throws", () => {
      saveDeck(makeDeck({ id: "1" }));
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      expect(() => updateDeck(makeDeck({ id: "1" }))).not.toThrow();
    });
  });

  describe("getSession / saveSession / clearSession", () => {
    it("returns null when no session exists", () => {
      expect(getSession("deck-1")).toBeNull();
    });

    it("saves and retrieves a session", () => {
      const session = { currentIndex: 2, results: ["correct", "incorrect"] as const, cardOrder: ["c2", "c3", "c1"] };
      saveSession("deck-1", session);
      expect(getSession("deck-1")).toEqual(session);
    });

    it("sessions are scoped per deck id", () => {
      saveSession("deck-a", { currentIndex: 1, results: ["correct"], cardOrder: ["c1", "c2"] });
      saveSession("deck-b", { currentIndex: 3, results: ["incorrect", "correct", "correct"], cardOrder: ["c3", "c1", "c2"] });
      expect(getSession("deck-a")?.currentIndex).toBe(1);
      expect(getSession("deck-b")?.currentIndex).toBe(3);
    });

    it("clearSession removes the session", () => {
      saveSession("deck-1", { currentIndex: 1, results: ["correct"], cardOrder: ["c1"] });
      clearSession("deck-1");
      expect(getSession("deck-1")).toBeNull();
    });

    it("clearSession is a no-op when no session exists", () => {
      expect(() => clearSession("deck-1")).not.toThrow();
    });

    it("saveSession does not throw when localStorage.setItem throws", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      expect(() => saveSession("deck-1", { currentIndex: 0, results: [], cardOrder: [] })).not.toThrow();
    });

    it("getSession returns null when localStorage contains invalid JSON", () => {
      localStorage.setItem("recall_session_deck-1", "not-json");
      expect(getSession("deck-1")).toBeNull();
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

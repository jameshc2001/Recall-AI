import { describe, it, expect, vi } from "vitest";
import {
  buildExportPayload,
  parseDeckExportFile,
  importDeckFromPayload,
  DeckExportFile,
} from "@/lib/deckIO";
import type { Deck } from "@/lib/types";
import type { PracticeSession } from "@/lib/storage";

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
    currentIndex: 1,
    results: ["correct"],
    cardOrder: ["c1"],
    ...overrides,
  };
}

function makeExportFile(overrides: Partial<DeckExportFile> = {}): DeckExportFile {
  return {
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    deck: makeDeck(),
    session: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildExportPayload
// ---------------------------------------------------------------------------
describe("buildExportPayload", () => {
  it("returns version 1", () => {
    const result = buildExportPayload(makeDeck(), null);
    expect(result.version).toBe(1);
  });

  it("includes a valid ISO exportedAt timestamp", () => {
    const before = Date.now();
    const result = buildExportPayload(makeDeck(), null);
    const after = Date.now();
    const ts = new Date(result.exportedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("includes the deck unchanged", () => {
    const deck = makeDeck();
    const result = buildExportPayload(deck, null);
    expect(result.deck).toEqual(deck);
  });

  it("includes the session when provided", () => {
    const session = makeSession();
    const result = buildExportPayload(makeDeck(), session);
    expect(result.session).toEqual(session);
  });

  it("sets session to null when null is passed", () => {
    const result = buildExportPayload(makeDeck(), null);
    expect(result.session).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseDeckExportFile — backwards compatibility (DO NOT DELETE OR MODIFY)
// ---------------------------------------------------------------------------
describe("parseDeckExportFile — backwards compat", () => {
  // BACKWARDS COMPAT: v1 — minimal payload (no note, no session)
  it("parses a minimal v1 payload with no card note and no session", () => {
    const payload = makeExportFile({ session: null });
    const result = parseDeckExportFile(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.version).toBe(1);
      expect(result.data.deck.cards[0].note).toBeUndefined();
      expect(result.data.session).toBeNull();
    }
  });

  // BACKWARDS COMPAT: v1 — card note is preserved
  it("preserves card note in a v1 payload", () => {
    const payload = makeExportFile({
      deck: makeDeck({ cards: [{ id: "c1", question: "Q?", answer: "A.", note: "my note" }] }),
    });
    const result = parseDeckExportFile(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.deck.cards[0].note).toBe("my note");
    }
  });

  // BACKWARDS COMPAT: v1 — session: null is accepted
  it("accepts session: null in a v1 payload", () => {
    const result = parseDeckExportFile(makeExportFile({ session: null }));
    expect(result.ok).toBe(true);
  });

  // BACKWARDS COMPAT: v1 — full session is accepted
  it("accepts a full session in a v1 payload", () => {
    const session = makeSession();
    const result = parseDeckExportFile(makeExportFile({ session }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.session).toEqual(session);
    }
  });

  // BACKWARDS COMPAT: v1 — multiple cards, some with notes
  it("handles multiple cards where only some have notes", () => {
    const deck = makeDeck({
      cards: [
        { id: "c1", question: "Q1?", answer: "A1.", note: "note1" },
        { id: "c2", question: "Q2?", answer: "A2." },
      ],
    });
    const result = parseDeckExportFile(makeExportFile({ deck }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.deck.cards[0].note).toBe("note1");
      expect(result.data.deck.cards[1].note).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// parseDeckExportFile — invalid inputs
// ---------------------------------------------------------------------------
describe("parseDeckExportFile — invalid inputs", () => {
  it("rejects null", () => {
    expect(parseDeckExportFile(null).ok).toBe(false);
  });

  it("rejects a string", () => {
    expect(parseDeckExportFile("hello").ok).toBe(false);
  });

  it("rejects an array", () => {
    expect(parseDeckExportFile([]).ok).toBe(false);
  });

  it("rejects missing version", () => {
    const { version: _v, ...noVersion } = makeExportFile();
    const result = parseDeckExportFile(noVersion);
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported version (e.g. 2)", () => {
    const result = parseDeckExportFile({ ...makeExportFile(), version: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/unsupported/i);
    }
  });

  it("rejects missing deck", () => {
    const { deck: _d, ...noDeck } = makeExportFile();
    expect(parseDeckExportFile(noDeck).ok).toBe(false);
  });

  it("rejects deck with missing title", () => {
    const payload = makeExportFile({ deck: { ...makeDeck(), title: "" } });
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });

  it("rejects deck with missing topic", () => {
    const payload = makeExportFile({ deck: { ...makeDeck(), topic: "" } });
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });

  it("rejects deck with non-array cards", () => {
    const payload = { ...makeExportFile(), deck: { ...makeDeck(), cards: "bad" } };
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });

  it("rejects deck with empty cards array", () => {
    const payload = makeExportFile({ deck: makeDeck({ cards: [] }) });
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });

  it("rejects a card missing id", () => {
    const deck = makeDeck({ cards: [{ id: "", question: "Q?", answer: "A." }] });
    expect(parseDeckExportFile(makeExportFile({ deck })).ok).toBe(false);
  });

  it("rejects a card missing question", () => {
    const deck = makeDeck({ cards: [{ id: "c1", question: "", answer: "A." }] });
    expect(parseDeckExportFile(makeExportFile({ deck })).ok).toBe(false);
  });

  it("rejects a card missing answer", () => {
    const deck = makeDeck({ cards: [{ id: "c1", question: "Q?", answer: "" }] });
    expect(parseDeckExportFile(makeExportFile({ deck })).ok).toBe(false);
  });

  it("rejects session where currentIndex is not a number", () => {
    const payload = makeExportFile({ session: { currentIndex: "bad", results: [], cardOrder: [] } as unknown as PracticeSession });
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });

  it("rejects session where results is not an array", () => {
    const payload = makeExportFile({ session: { currentIndex: 0, results: "bad", cardOrder: [] } as unknown as PracticeSession });
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });

  it("rejects session where cardOrder is not an array", () => {
    const payload = makeExportFile({ session: { currentIndex: 0, results: [], cardOrder: "bad" } as unknown as PracticeSession });
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });

  it("rejects session where cardOrder contains non-strings", () => {
    const payload = makeExportFile({ session: { currentIndex: 0, results: [], cardOrder: [1, 2] } as unknown as PracticeSession });
    expect(parseDeckExportFile(payload).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// importDeckFromPayload
// ---------------------------------------------------------------------------
describe("importDeckFromPayload", () => {
  it("calls saveDeck with a new ID (not the original)", () => {
    const saveDeckMock = vi.fn();
    const saveSessionMock = vi.fn();
    const payload = makeExportFile();
    importDeckFromPayload(payload, { saveDeck: saveDeckMock, saveSession: saveSessionMock });
    expect(saveDeckMock).toHaveBeenCalledOnce();
    const savedDeck = saveDeckMock.mock.calls[0][0];
    expect(savedDeck.id).not.toBe(payload.deck.id);
  });

  it("assigns the UUID from crypto.randomUUID as the new deck ID", () => {
    // setup.ts stubs crypto.randomUUID to return "test-uuid-1234"
    const saveDeckMock = vi.fn();
    const saveSessionMock = vi.fn();
    importDeckFromPayload(makeExportFile(), { saveDeck: saveDeckMock, saveSession: saveSessionMock });
    expect(saveDeckMock.mock.calls[0][0].id).toBe("test-uuid-1234");
  });

  it("preserves all other deck fields", () => {
    const saveDeckMock = vi.fn();
    const saveSessionMock = vi.fn();
    const deck = makeDeck({ title: "My Deck", topic: "Science", cards: [{ id: "c1", question: "Q?", answer: "A.", note: "n" }] });
    importDeckFromPayload(makeExportFile({ deck }), { saveDeck: saveDeckMock, saveSession: saveSessionMock });
    const saved = saveDeckMock.mock.calls[0][0];
    expect(saved.title).toBe("My Deck");
    expect(saved.topic).toBe("Science");
    expect(saved.createdAt).toBe(deck.createdAt);
    expect(saved.cards).toEqual(deck.cards);
  });

  it("calls saveSession with the new deck ID when session is present", () => {
    const saveDeckMock = vi.fn();
    const saveSessionMock = vi.fn();
    const session = makeSession();
    importDeckFromPayload(makeExportFile({ session }), { saveDeck: saveDeckMock, saveSession: saveSessionMock });
    expect(saveSessionMock).toHaveBeenCalledOnce();
    expect(saveSessionMock.mock.calls[0][0]).toBe("test-uuid-1234");
    expect(saveSessionMock.mock.calls[0][1]).toEqual(session);
  });

  it("does not call saveSession when session is null", () => {
    const saveDeckMock = vi.fn();
    const saveSessionMock = vi.fn();
    importDeckFromPayload(makeExportFile({ session: null }), { saveDeck: saveDeckMock, saveSession: saveSessionMock });
    expect(saveSessionMock).not.toHaveBeenCalled();
  });

  it("returns the new deck ID", () => {
    const saveDeckMock = vi.fn();
    const saveSessionMock = vi.fn();
    const id = importDeckFromPayload(makeExportFile(), { saveDeck: saveDeckMock, saveSession: saveSessionMock });
    expect(id).toBe("test-uuid-1234");
  });
});

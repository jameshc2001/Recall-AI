import { Deck } from "./types";
import { PracticeSession, saveDeck, saveSession } from "./storage";

export interface DeckExportFile {
  version: 1;
  exportedAt: string;
  deck: Deck;
  session: PracticeSession | null;
}

type ParseResult =
  | { ok: true; data: DeckExportFile }
  | { ok: false; error: string };

function err(message: string): ParseResult {
  return { ok: false, error: message };
}

export function buildExportPayload(
  deck: Deck,
  session: PracticeSession | null
): DeckExportFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    deck,
    session,
  };
}

export function downloadDeckFile(payload: DeckExportFile): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = payload.deck.title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, "_");
  a.href = url;
  a.download = `${safeName || "deck"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Version-dispatch parser — NEVER modify parseV1; add parseV2 etc. for new versions.
// Every historical version must remain importable forever.
export function parseDeckExportFile(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return err("Invalid file format");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version === 1) return parseV1(obj);
  return err(
    `Unsupported file version: ${obj.version ?? "(missing)"}. Please use a newer version of Recall AI to import this file.`
  );
}

// parseV1 — DO NOT MODIFY. This is the canonical parser for version 1 exports.
// Backwards compatibility guarantee: all version 1 files must always parse successfully.
function parseV1(obj: Record<string, unknown>): ParseResult {
  const deck = obj.deck;
  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    return err("Invalid file: missing deck");
  }
  const d = deck as Record<string, unknown>;

  if (typeof d.id !== "string" || !d.id) {
    return err("Invalid file: missing deck id");
  }
  if (typeof d.title !== "string" || !d.title) {
    return err("Invalid file: missing deck title");
  }
  if (typeof d.topic !== "string" || !d.topic) {
    return err("Invalid file: missing deck topic");
  }
  if (typeof d.createdAt !== "string") {
    return err("Invalid file: missing deck createdAt");
  }
  if (!Array.isArray(d.cards) || d.cards.length === 0) {
    return err("Invalid file: deck must have at least one card");
  }

  for (let i = 0; i < d.cards.length; i++) {
    const card = d.cards[i];
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      return err(`Invalid file: card at index ${i} is not an object`);
    }
    const c = card as Record<string, unknown>;
    if (typeof c.id !== "string" || !c.id) {
      return err(`Invalid file: card at index ${i} is missing id`);
    }
    if (typeof c.question !== "string" || !c.question) {
      return err(`Invalid file: card at index ${i} is missing question`);
    }
    if (typeof c.answer !== "string" || !c.answer) {
      return err(`Invalid file: card at index ${i} is missing answer`);
    }
    // note is optional — present in v1 but not required
  }

  // Validate session if present (null is valid)
  const session = obj.session;
  let parsedSession: PracticeSession | null = null;
  if (session !== null && session !== undefined) {
    if (typeof session !== "object" || Array.isArray(session)) {
      return err("Invalid file: session must be an object or null");
    }
    const s = session as Record<string, unknown>;
    if (typeof s.currentIndex !== "number") {
      return err("Invalid file: session.currentIndex must be a number");
    }
    if (!Array.isArray(s.results)) {
      return err("Invalid file: session.results must be an array");
    }
    if (!Array.isArray(s.cardOrder)) {
      return err("Invalid file: session.cardOrder must be an array");
    }
    if (s.cardOrder.some((id) => typeof id !== "string")) {
      return err("Invalid file: session.cardOrder must be an array of strings");
    }
    parsedSession = {
      currentIndex: s.currentIndex as number,
      results: s.results as Array<"correct" | "incorrect">,
      cardOrder: s.cardOrder as string[],
    };
  }

  const parsedDeck: Deck = {
    id: d.id as string,
    title: d.title as string,
    topic: d.topic as string,
    createdAt: d.createdAt as string,
    cards: (d.cards as Array<Record<string, unknown>>).map((c) => ({
      id: c.id as string,
      question: c.question as string,
      answer: c.answer as string,
      ...(typeof c.note === "string" ? { note: c.note } : {}),
    })),
  };

  return {
    ok: true,
    data: {
      version: 1,
      exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "",
      deck: parsedDeck,
      session: parsedSession,
    },
  };
}

export function importDeckFromPayload(
  payload: DeckExportFile,
  deps: {
    saveDeck: typeof saveDeck;
    saveSession: typeof saveSession;
  }
): string {
  const newId = crypto.randomUUID();
  const newDeck: Deck = { ...payload.deck, id: newId };
  deps.saveDeck(newDeck);
  if (payload.session) {
    deps.saveSession(newId, payload.session);
  }
  return newId;
}

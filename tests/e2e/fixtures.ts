import { test as base, expect, type Page } from "@playwright/test";
import type { Deck } from "@/lib/types";
import type { DeckExportFile } from "@/lib/deckIO";

// ---------------------------------------------------------------------------
// Test harness: auth + in-memory fake of /api/store/*
// ---------------------------------------------------------------------------

/** Must match ADMIN_PASSWORD in playwright.config.ts webServer.env. */
export const E2E_ADMIN_PASSWORD = "e2e-test-password";

interface FakeStore {
  decks: Deck[];
  sessions: Map<string, unknown>;
}

const stores = new WeakMap<Page, FakeStore>();

function storeFor(page: Page): FakeStore {
  const store = stores.get(page);
  if (!store) throw new Error("Fake store not installed — import `test` from ./fixtures, not @playwright/test");
  return store;
}

/**
 * Replaces the Redis-backed /api/store/* routes with an in-memory store that
 * lives for the duration of one test (and survives page reloads/navigation).
 * Tests never touch real Redis.
 */
async function installFakeStore(page: Page): Promise<void> {
  const store: FakeStore = { decks: [], sessions: new Map() };
  stores.set(page, store);

  await page.route("**/api/store/decks**", async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === "GET") {
      return route.fulfill({ json: { decks: store.decks } });
    }
    if (method === "POST") {
      const { deck } = req.postDataJSON() as { deck: Deck };
      const idx = store.decks.findIndex((d) => d.id === deck.id);
      if (idx >= 0) store.decks[idx] = deck;
      else store.decks.push(deck);
      return route.fulfill({ json: { ok: true } });
    }
    if (method === "DELETE") {
      const id = new URL(req.url()).searchParams.get("id");
      store.decks = store.decks.filter((d) => d.id !== id);
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ status: 405, json: { error: "Method not allowed" } });
  });

  await page.route("**/api/store/sessions/*", async (route) => {
    const req = route.request();
    const id = decodeURIComponent(new URL(req.url()).pathname.split("/").pop() ?? "");
    const method = req.method();
    if (method === "GET") {
      return route.fulfill({ json: { session: store.sessions.get(id) ?? null } });
    }
    if (method === "PUT") {
      store.sessions.set(id, req.postDataJSON());
      return route.fulfill({ json: { ok: true } });
    }
    if (method === "DELETE") {
      store.sessions.delete(id);
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ status: 405, json: { error: "Method not allowed" } });
  });
}

/** Read the fake store's current decks (e.g. to assert what the app saved). */
export function getStoredDecks(page: Page): Deck[] {
  return storeFor(page).decks;
}

/** Read a session from the fake store. */
export function getStoredSession(page: Page, deckId: string): unknown {
  return storeFor(page).sessions.get(deckId) ?? null;
}

/**
 * Use this `test` in every spec. Each page is logged in (via the real
 * /api/auth/login route) and gets a fresh fake store.
 */
export const test = base.extend<{ loggedIn: boolean }>({
  // Set `test.use({ loggedIn: false })` to test unauthenticated behaviour
  loggedIn: [true, { option: true }],
  page: async ({ page, loggedIn }, use) => {
    await installFakeStore(page);
    if (loggedIn) {
      const res = await page.request.post("/api/auth/login", {
        data: { password: E2E_ADMIN_PASSWORD },
      });
      expect(res.ok(), "E2E login failed — check webServer.env in playwright.config.ts").toBe(true);
    }
    await use(page);
  },
});

export { expect };

export const STUB_DECK: Deck = {
  id: "test-deck-001",
  title: "JavaScript Basics",
  topic: "JavaScript",
  createdAt: "2026-01-01T00:00:00.000Z",
  cards: [
    { id: "c1", question: "What is a closure?", answer: "A function that captures its surrounding scope." },
    { id: "c2", question: "What is hoisting?", answer: "Variable/function declarations moved to top of scope." },
    { id: "c3", question: "What does === check?", answer: "Value and type equality (strict equality)." },
  ],
};

/** The JSON block Claude would emit when generating a deck. */
export const STUB_DECK_RESPONSE_CONTENT = `
Here is your deck!

\`\`\`json
${JSON.stringify({
  title: STUB_DECK.title,
  topic: STUB_DECK.topic,
  cards: STUB_DECK.cards,
})}
\`\`\`
`;

/** Seed decks into the fake store. Call before navigating. */
export async function seedDecks(page: Page, decks: Deck[]) {
  storeFor(page).decks = structuredClone(decks);
}

// BACKWARDS COMPAT: These fixtures represent the v1 export format.
// Do NOT modify these — they are the canonical representation of v1 files.
// When adding a new export format version, add new fixtures alongside these.
export const STUB_EXPORT_FILE: DeckExportFile = {
  version: 1,
  exportedAt: "2026-01-01T00:00:00.000Z",
  deck: STUB_DECK,
  session: null,
};

export const STUB_EXPORT_FILE_WITH_SESSION: DeckExportFile = {
  version: 1,
  exportedAt: "2026-01-01T00:00:00.000Z",
  deck: STUB_DECK,
  session: {
    currentIndex: 1,
    results: ["correct"],
    cardOrder: ["c2", "c1", "c3"],
  },
};

/** Seed a practice session into the fake store. Call before navigating. */
export async function seedSession(
  page: Page,
  deckId: string,
  cardOrder: string[],
  overrides?: { currentIndex?: number; results?: Array<"correct" | "incorrect"> }
) {
  storeFor(page).sessions.set(deckId, {
    currentIndex: overrides?.currentIndex ?? 0,
    results: overrides?.results ?? [],
    cardOrder,
  });
}

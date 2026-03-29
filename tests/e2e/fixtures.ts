import type { Deck } from "@/lib/types";

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

/** Seed recall_decks in localStorage before navigating. */
export async function seedDecks(page: import("@playwright/test").Page, decks: Deck[]) {
  await page.addInitScript((data) => {
    localStorage.setItem("recall_decks", JSON.stringify(data));
  }, decks);
}

/** Seed a practice session in localStorage before navigating. */
export async function seedSession(
  page: import("@playwright/test").Page,
  deckId: string,
  cardOrder: string[],
  overrides?: { currentIndex?: number; results?: boolean[] }
) {
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    {
      key: `recall_session_${deckId}`,
      session: {
        currentIndex: overrides?.currentIndex ?? 0,
        results: overrides?.results ?? [],
        cardOrder,
      },
    }
  );
}

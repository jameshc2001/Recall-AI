# Recall AI — Flashcard Generator

## Project Overview
A clean, minimal web app that uses the Claude API to generate flashcard decks on any topic. Claude asks the user clarifying questions (topic, difficulty, number of cards, etc.) before generating the deck. Users can save decks and practice them using a flip-card interface where they self-mark correct/incorrect.

## Tech Stack
- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS 3 + autoprefixer
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) — API calls made server-side only, model `claude-sonnet-4-6`
- **Storage:** localStorage for saving decks (no database required)

## Core Features
1. **Deck Creation** — Conversational flow where Claude asks clarifying questions before generating cards
2. **Card Format** — Simple question / answer pairs (no multiple choice)
3. **Practice Mode** — Flip card to reveal answer, user marks themselves right or wrong
4. **Deck Management** — Save, view, and delete decks; decks persist via localStorage

## Design Principles
- Clean and minimal UI — no clutter
- Neutral color palette with clear typography
- Smooth card flip animation

## Project Structure
```
/app
  layout.tsx               — Root layout (Geist font, global styles, metadata)
  page.tsx                 — Home / deck list
  /api/chat/route.ts       — Claude API proxy (server-side only)
  /create/page.tsx         — Conversational deck creation flow
  /practice/[id]/page.tsx  — Practice mode for a deck
/components
  DeckCard.tsx             — Single deck tile (title, count, date, delete/practice)
  DeckList.tsx             — Responsive grid of DeckCards + empty state
  ChatMessage.tsx          — Message bubble (user/assistant); strips JSON from display
  ChatWindow.tsx           — Scrollable chat list + input form with loading indicator
  FlashCard.tsx            — 3D CSS flip card (question front / answer back)
  ProgressBar.tsx          — current / total progress indicator
  ScoreSummary.tsx         — End-of-session score with restart/home actions
/lib
  types.ts                 — Card, Deck, Message interfaces
  storage.ts               — localStorage helpers (getDecks, getDeckById, saveDeck, deleteDeck)
  deckParser.ts            — Extracts and validates JSON deck from Claude's response
/tests
  /unit
    setup.ts               — jsdom polyfills + localStorage.clear() between tests
    deckParser.test.ts     — Unit tests for parseDeckFromMessage
    storage.test.ts        — Unit tests for localStorage helpers
  /e2e
    fixtures.ts            — Shared deck data + seedDecks() helper
    home.spec.ts           — Home page E2E tests
    create.spec.ts         — Deck creation flow E2E tests (stubs /api/chat)
    practice.spec.ts       — Practice session E2E tests
```

## Testing

### Requirement — always write tests
**Every code change must include appropriate tests. Do not leave tests as a follow-up.**

- **Pure logic** (`lib/`, utility functions, new helpers) → Vitest unit test in `tests/unit/`.
- **User-facing flows** (new pages, significant UI changes, new interactions) → Playwright E2E test in `tests/e2e/`.
- **Components with non-trivial logic** → Vitest + React Testing Library in `components/__tests__/`.
- After any change, run `npm test` (unit) and verify it passes before finishing. Run `npm run test:e2e` for E2E changes.
- Never leave a failing test in place — fix the test or the code, whichever is wrong.

### Stubbing external calls
- All E2E tests that touch the create flow **must** stub `POST /api/chat` using `page.route()`. Never make real Claude API calls in tests.
- Seed localStorage using the `seedDecks()` helper from `tests/e2e/fixtures.ts` rather than navigating through the UI to create data.
- Unit tests that touch `storage.ts` rely on jsdom's localStorage — no mocking needed; it is cleared automatically in `tests/unit/setup.ts`.

### Commands
```bash
npm test                  # Vitest unit tests (fast, ~1s)
npm run test:watch        # Vitest in watch mode
npm run test:coverage     # Unit test coverage report
npm run test:e2e          # Playwright E2E (starts dev server automatically)
npm run test:e2e:ui       # Playwright with interactive UI
```

### Config files
- `vitest.config.ts` — jsdom environment, `@` alias, excludes `tests/e2e/`
- `playwright.config.ts` — Chromium only, baseURL `http://localhost:3000`, auto-starts `next dev`

## Setup Notes
- The package name is `recall-ai` (lowercase, no spaces) — the directory name "Recall AI" cannot be used directly as an npm package name.
- `autoprefixer` must be installed as a dev dependency alongside Tailwind (not included by default when bootstrapping manually).
- Project was bootstrapped manually rather than via `create-next-app` due to the directory name constraint.

## Environment Variables
- `ANTHROPIC_API_KEY` — Claude API key. Stored in `.env.local`, never exposed to the client.

## Key Constraints
- The Anthropic API key must **never** appear in client-side code. All Claude calls go through `/app/api/` routes.
- Do not use a database — localStorage is sufficient for this project.
- Keep dependencies minimal.

## TypeScript Types
```typescript
interface Card {
  id: string;
  question: string;
  answer: string;
}

interface Deck {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
  cards: Card[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}
```

## localStorage Schema
All decks are stored under a single key:
```
Key:   "recall_decks"
Value: JSON.stringify(Deck[])
```

## Claude API Route
- **Endpoint:** `POST /api/chat`
- **Request body:** `{ messages: Message[] }`
- **Response body:** `{ role: "assistant", content: string }`
- Non-streaming. System prompt is injected server-side (never sent to the client).
- Claude is instructed to gather topic/difficulty/count, confirm, then emit a fenced `\`\`\`json` block containing the deck. `lib/deckParser.ts` extracts and validates this block.

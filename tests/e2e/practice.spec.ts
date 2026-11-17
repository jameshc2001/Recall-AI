import { test, expect, seedDecks, seedSession, STUB_DECK } from "./fixtures";
import type { Deck } from "@/lib/types";

const ORIGINAL_ORDER = STUB_DECK.cards.map((c) => c.id);

test.describe("Practice page", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
  });

  test("redirects to home for an unknown deck id", async ({ page }) => {
    await page.goto("/practice/does-not-exist");
    await expect(page).toHaveURL("/");
  });

  test("shows the deck title and first card question", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByText(STUB_DECK.title)).toBeVisible();
    await expect(page.getByText(STUB_DECK.cards[0].question)).toBeVisible();
  });

  test("shows progress bar starting at 1 of total", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();
  });

  test("flipping the card reveals the answer and mark buttons", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByRole("button", { name: "Correct", exact: true })).not.toBeVisible();
    await page.getByText(STUB_DECK.cards[0].question).click();
    await expect(page.getByRole("button", { name: "Correct", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Incorrect", exact: true })).toBeVisible();
  });

  test("clicking a flipped card flips it back, keeping mark buttons visible", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    const card = page.getByTestId("flashcard");
    await expect(card).toHaveAttribute("data-flipped", "false");
    await card.click();
    await expect(card).toHaveAttribute("data-flipped", "true");
    await card.click();
    await expect(card).toHaveAttribute("data-flipped", "false");
    await expect(page.getByRole("button", { name: "Correct", exact: true })).toBeVisible();
    // And it can be flipped forward again
    await card.click();
    await expect(card).toHaveAttribute("data-flipped", "true");
  });

  test("marking a card after flipping it back advances to the next card", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    const card = page.getByTestId("flashcard");
    await card.click();
    await card.click();
    await expect(card).toHaveAttribute("data-flipped", "false");
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    await expect(page.getByText(`Card 2 of ${STUB_DECK.cards.length}`)).toBeVisible();
    await expect(page.getByText(STUB_DECK.cards[1].question)).toBeVisible();
    await expect(page.getByRole("button", { name: "Correct", exact: true })).not.toBeVisible();
  });

  test("marking correct advances to next card", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    // Wait for the 125ms setTimeout animation swap
    await expect(page.getByText(STUB_DECK.cards[1].question)).toBeVisible({ timeout: 2000 });
    await expect(page.getByText(`Card 2 of ${STUB_DECK.cards.length}`)).toBeVisible();
  });

  test("completing all cards shows the summary screen", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);

    for (const card of STUB_DECK.cards) {
      await page.getByText(card.question).click();
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      // Allow card swap animation
      await page.waitForTimeout(200);
    }

    await expect(page.getByText("Session complete")).toBeVisible();
  });

  test("score shows 100% when all cards marked correct", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);

    for (const card of STUB_DECK.cards) {
      await page.getByText(card.question).click();
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      await page.waitForTimeout(200);
    }

    await expect(page.getByText(/100/)).toBeVisible();
  });

  test("restart resets the session back to card 1", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);

    for (const card of STUB_DECK.cards) {
      await page.getByText(card.question).click();
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      await page.waitForTimeout(200);
    }

    await page.getByRole("button", { name: "Practice again" }).click();
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();
  });
});

test.describe("Session persistence", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
  });

  test("progress is restored after navigating away and back", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    // Decks/sessions load asynchronously — wait for the first card before probing
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();

    // Find and click whichever card is shown first
    const questions = STUB_DECK.cards.map((c) => c.question);
    let firstQuestion: string | null = null;
    for (const q of questions) {
      if (await page.getByText(q).isVisible()) { firstQuestion = q; break; }
    }
    expect(firstQuestion).not.toBeNull();

    await page.getByText(firstQuestion!).click();
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    await page.waitForTimeout(200);

    // Note which card is now showing
    let secondQuestion: string | null = null;
    for (const q of questions) {
      if (await page.getByText(q).isVisible()) { secondQuestion = q; break; }
    }
    expect(secondQuestion).not.toBeNull();

    // Navigate away and back
    await page.goto("/");
    await page.goto(`/practice/${STUB_DECK.id}`);

    // Should resume at card 2 showing the same card as before
    await expect(page.getByText(`Card 2 of ${STUB_DECK.cards.length}`)).toBeVisible();
    await expect(page.getByText(secondQuestion!)).toBeVisible();
  });

  test("card order is preserved when resuming mid-session", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();

    // Record the order all 3 cards appear in by marking each one
    const seen: string[] = [];
    for (let i = 0; i < STUB_DECK.cards.length - 1; i++) {
      for (const q of STUB_DECK.cards.map((c) => c.question)) {
        if (await page.getByText(q).isVisible()) { seen.push(q); break; }
      }
      await page.getByText(seen[seen.length - 1]).click();
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      await expect(page.getByText(`Card ${i + 2} of ${STUB_DECK.cards.length}`)).toBeVisible();
      await page.waitForTimeout(200);
    }

    // Navigate away — now at card 3
    await page.goto("/");
    await page.goto(`/practice/${STUB_DECK.id}`);

    // Should be at card 3 and show the card we haven't seen yet
    await expect(page.getByText(`Card 3 of ${STUB_DECK.cards.length}`)).toBeVisible();
    const remaining = STUB_DECK.cards.map((c) => c.question).filter((q) => !seen.includes(q));
    await expect(page.getByText(remaining[0])).toBeVisible();
  });

  test("'Start over' button appears after marking a card", async ({ page }) => {
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByRole("button", { name: "Start over" })).not.toBeVisible();

    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    await page.waitForTimeout(200);

    await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
  });

  test("'Start over' resets to card 1 and clears the saved session", async ({ page }) => {
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
    await page.goto(`/practice/${STUB_DECK.id}`);

    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    await page.waitForTimeout(200);

    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();

    // Navigate away and back — old session was replaced with fresh shuffle at card 1
    await page.goto("/");
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();
  });

  test("session is cleared after completing all cards", async ({ page }) => {
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
    await page.goto(`/practice/${STUB_DECK.id}`);

    for (const card of STUB_DECK.cards) {
      await page.getByText(card.question).click();
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      await page.waitForTimeout(200);
    }

    await expect(page.getByText("Session complete")).toBeVisible();

    // Navigate back to practice — should start fresh at card 1
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();
  });
});

test.describe("Card notes", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
  });

  test("notes panel is not visible before flipping the card", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await expect(page.getByText("Add a note")).not.toBeVisible();
  });

  test("'Add a note' affordance appears after flipping the card", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await expect(page.getByText("Add a note")).toBeVisible();
  });

  test("clicking 'Add a note' reveals a textarea", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await expect(page.getByRole("textbox")).toBeVisible();
  });

  test("typing and saving a note renders it as content", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByRole("textbox").fill("This is my note");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByRole("textbox")).not.toBeVisible();
    await expect(page.getByText("This is my note")).toBeVisible();
  });

  test("saved note persists after navigating away and back", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByRole("textbox").fill("Persistent note content");
    await page.getByRole("button", { name: "Save note" }).click();

    // Navigate away and return
    await page.goto("/");
    await page.goto(`/practice/${STUB_DECK.id}`);

    // Flip the card again — note should load from localStorage
    await page.getByText(STUB_DECK.cards[0].question).click();
    await expect(page.getByText("Persistent note content")).toBeVisible();
  });

  test("note editor resets when advancing to the next card", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByRole("textbox").fill("draft text not saved");

    // Advance without saving
    await page.getByRole("button", { name: "Correct", exact: true }).click();
    await expect(page.getByText(STUB_DECK.cards[1].question)).toBeVisible({ timeout: 2000 });

    // Flip the next card and check there is no pre-filled draft
    await page.getByText(STUB_DECK.cards[1].question).click();
    await page.getByText("Add a note").click();
    await expect(page.getByRole<HTMLTextAreaElement>("textbox")).toHaveValue("");
  });

  test("Cancel discards changes and returns to view state", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByRole("textbox").fill("draft that should be discarded");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("textbox")).not.toBeVisible();
    await expect(page.getByText("Add a note")).toBeVisible();
  });

  test("existing note shown when deck seeded with a note", async ({ page }) => {
    const deckWithNote: Deck = {
      ...STUB_DECK,
      id: "deck-with-note",
      cards: [
        { ...STUB_DECK.cards[0], note: "Pre-existing note text" },
        ...STUB_DECK.cards.slice(1),
      ],
    };
    await seedDecks(page, [deckWithNote]);
    await seedSession(page, deckWithNote.id, deckWithNote.cards.map((c) => c.id));
    await page.goto(`/practice/${deckWithNote.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await expect(page.getByText("Pre-existing note text")).toBeVisible();
  });

  test("LaTeX math in a note is rendered with KaTeX, not shown raw", async ({ page }) => {
    const deckWithMath: Deck = {
      ...STUB_DECK,
      id: "deck-with-math",
      cards: [
        {
          ...STUB_DECK.cards[0],
          note: "Vega is\n\n$$\n\\text{Vega} = \\frac{\\partial V}{\\partial \\sigma}\n$$\n\nwhere $\\sigma_t$ is volatility.",
        },
        ...STUB_DECK.cards.slice(1),
      ],
    };
    await seedDecks(page, [deckWithMath]);
    await seedSession(page, deckWithMath.id, deckWithMath.cards.map((c) => c.id));
    await page.goto(`/practice/${deckWithMath.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();

    const note = page.getByTestId("note-wrapper");
    await expect(note.locator(".katex-display")).toBeVisible();
    await expect(note.locator(".katex").nth(1)).toBeVisible(); // inline $\sigma_t$
    await expect(note).not.toContainText("$$");
    // .katex-html is the visible output; KaTeX also keeps the TeX source in a
    // hidden MathML annotation for screen readers, so only check the visible part
    await expect(note.locator(".katex-html").first()).not.toContainText("\\frac");

    // Layout sanity: the fraction bar sits between numerator and denominator, and
    // the display block's overflow-y:hidden doesn't clip the bottom. (The CSS/JS
    // version mismatch that broke fractions is guarded by katexVersion.test.ts.)
    const layout = await note.locator(".katex-display").first().evaluate((el) => {
      const line = el.querySelector(".frac-line")!.getBoundingClientRect();
      const [denom, numer] = Array.from(el.querySelectorAll(".mfrac .vlist-r:first-child > .vlist > span"))
        .filter((s) => !s.querySelector(".frac-line"))
        // skip KaTeX's invisible .pstrut spacer; measure the rendered content
        .map((s) => s.querySelector(":scope > :not(.pstrut)")!.getBoundingClientRect());
      return {
        numerBottom: numer.bottom, denomTop: denom.top, lineTop: line.top, lineBottom: line.bottom,
        scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
      };
    });
    expect(layout.numerBottom).toBeLessThanOrEqual(layout.lineTop + 1);
    expect(layout.denomTop).toBeGreaterThanOrEqual(layout.lineBottom - 1);
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight);
  });

  async function openNote(page: import("@playwright/test").Page, note: string) {
    const deck: Deck = {
      ...STUB_DECK,
      id: "deck-with-diagram",
      cards: [{ ...STUB_DECK.cards[0], note }, ...STUB_DECK.cards.slice(1)],
    };
    await seedDecks(page, [deck]);
    await seedSession(page, deck.id, deck.cards.map((c) => c.id));
    await page.goto(`/practice/${deck.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    return page.getByTestId("note-wrapper");
  }

  test("mermaid code block in a note renders as a diagram", async ({ page }) => {
    const note = await openNote(
      page,
      "Flow:\n\n```mermaid\ngraph TD\n  A[Question] --> B[Answer]\n```"
    );
    const diagram = note.getByTestId("mermaid-diagram");
    // Mermaid is lazily loaded and compiled on first use by next dev — allow time
    await expect(diagram.locator("svg")).toBeVisible({ timeout: 20_000 });
    await expect(diagram).toContainText("Question");
    await expect(note).not.toContainText("graph TD");
  });

  test("invalid mermaid syntax falls back to showing the source", async ({ page }) => {
    const note = await openNote(page, "```mermaid\nthis is not a diagram -->\n```");
    await expect(note.getByTestId("mermaid-fallback")).toBeVisible({ timeout: 20_000 });
    await expect(note.getByText("Couldn't render diagram")).toBeVisible();
    await expect(note).toContainText("this is not a diagram -->");
  });
});

test.describe("Scrollable layout", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
  });

  test("page is scrollable after note appears (note does not use its own scroll container)", async ({ page }) => {
    // Seed a deck with a long note so there is enough content to scroll
    const deckWithNote: Deck = {
      ...STUB_DECK,
      id: "deck-scroll-test",
      cards: [
        {
          ...STUB_DECK.cards[0],
          note: Array(40).fill("This is a line of note content.").join("\n"),
        },
        ...STUB_DECK.cards.slice(1),
      ],
    };
    await seedDecks(page, [deckWithNote]);
    await seedSession(page, deckWithNote.id, deckWithNote.cards.map((c) => c.id));

    await page.goto(`/practice/${deckWithNote.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();

    // The note should be visible in the document
    await expect(page.getByText("This is a line of note content.").first()).toBeVisible();

    // The page (window) should be scrollable — content exceeds the viewport
    const pageIsScrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > document.documentElement.clientHeight
    );
    expect(pageIsScrollable).toBe(true);

    // The note wrapper div should NOT have overflow-y-auto (no independent scroll box)
    const noteHasOwnScroll = await page.evaluate(() => {
      const noteEl = document.querySelector("[data-testid='note-wrapper']");
      if (!noteEl) return false;
      return getComputedStyle(noteEl).overflowY === "auto" || getComputedStyle(noteEl).overflowY === "scroll";
    });
    expect(noteHasOwnScroll).toBe(false);
  });
});

test.describe("AI note generation", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
  });

  test("'Ask AI to fill this note' button appears in edit mode", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await expect(page.getByText("Ask AI to fill this note")).toBeVisible();
  });

  test("clicking the AI button reveals a prompt input", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByText("Ask AI to fill this note").click();
    await expect(page.getByPlaceholder("What should AI write?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  });

  test("generating fills the draft textarea with AI content", async ({ page }) => {
    await page.route("**/api/note", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: "## AI Note\n\nThis is the generated content." }),
      });
    });

    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByText("Ask AI to fill this note").click();
    await page.getByPlaceholder("What should AI write?").fill("explain with examples");
    await page.getByRole("button", { name: "Generate" }).click();

    // AI panel closes, draft textarea should be populated
    await expect(page.getByPlaceholder("What should AI write?")).not.toBeVisible();
    await expect(page.getByPlaceholder("Add a note…")).toHaveValue(/## AI Note/);
  });

  test("saving an AI-generated note persists and renders markdown", async ({ page }) => {
    await page.route("**/api/note", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: "## Key Insight\n\n- Point one\n- Point two" }),
      });
    });

    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByText("Ask AI to fill this note").click();
    await page.getByPlaceholder("What should AI write?").fill("summarise");
    await page.getByRole("button", { name: "Generate" }).click();
    await page.getByRole("button", { name: "Save note" }).click();

    await expect(page.getByRole("heading", { name: "Key Insight" })).toBeVisible();
    await expect(page.getByText("Point one")).toBeVisible();
  });

  test("shows an error message when the API fails", async ({ page }) => {
    await page.route("**/api/note", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to reach Claude API" }),
      });
    });

    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await page.getByText("Ask AI to fill this note").click();
    await page.getByPlaceholder("What should AI write?").fill("explain");
    await page.getByRole("button", { name: "Generate" }).click();

    await expect(page.getByText("Failed to reach Claude API")).toBeVisible();
  });

  test("Cancel in AI panel dismisses it without clearing the draft", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();

    // Type something in the note textarea first
    await page.getByPlaceholder("Add a note…").fill("my draft");

    // Open AI panel then cancel
    await page.getByText("Ask AI to edit this note").click();
    await page.getByPlaceholder("What should AI change?").fill("some prompt");
    await page.locator(".flex.flex-col.gap-2.rounded-xl").getByRole("button", { name: "Cancel" }).click();

    // AI panel gone, draft still intact
    await expect(page.getByPlaceholder("What should AI change?")).not.toBeVisible();
    await expect(page.getByPlaceholder("Add a note…")).toHaveValue("my draft");
  });

  test("editing an existing draft sends it to the AI as currentNote", async ({ page }) => {
    let requestBody: Record<string, unknown> = {};
    await page.route("**/api/note", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: "## Revised note" }),
      });
    });

    await page.goto(`/practice/${STUB_DECK.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await page.getByText("Add a note").click();
    await expect(page.getByText("Ask AI to fill this note")).toBeVisible();
    await page.getByPlaceholder("Add a note…").fill("my existing note");
    await page.getByText("Ask AI to edit this note").click();
    await page.getByPlaceholder("What should AI change?").fill("make it shorter");
    await page.getByRole("button", { name: "Generate" }).click();

    await expect(page.getByPlaceholder("Add a note…")).toHaveValue("## Revised note");
    expect(requestBody.currentNote).toBe("my existing note");
    expect(requestBody.prompt).toBe("make it shorter");
  });
});

const LONG_ANSWER_DECK: Deck = {
  id: "long-answer-deck",
  title: "Long answers",
  topic: "Layout",
  createdAt: "2026-01-01T00:00:00.000Z",
  cards: [
    {
      id: "long1",
      question: "What happens with a very long answer?",
      answer:
        "Supercalifragilisticexpialidociouspneumonoultramicroscopicsilicovolcanoconiosis " +
        "https://example.com/a/really/long/unbroken/url/that/should/wrap/inside/the/card " +
        "This answer is deliberately long so that it overflows the fixed card height on a phone. ".repeat(6),
    },
  ],
};

test.describe("Practice layout — mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [LONG_ANSWER_DECK]);
    await seedSession(page, LONG_ANSWER_DECK.id, ["long1"]);
  });

  test("long answer stays inside the card and scrolls", async ({ page }) => {
    await page.goto(`/practice/${LONG_ANSWER_DECK.id}`);
    const card = page.getByTestId("flashcard");
    await card.click();
    await expect(card).toHaveAttribute("data-flipped", "true");

    const cardBox = (await card.boundingBox())!;
    // Mobile padding is tight: card spans nearly the full 375px viewport
    expect(cardBox.width).toBeGreaterThanOrEqual(340);

    // Text never overflows horizontally
    const scroll = page.getByTestId("flashcard-answer-scroll");
    const { scrollWidth, clientWidth, scrollHeight, clientHeight } = await scroll.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Vertical overflow is contained in a scrollable area, starting at the top
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    const answerTop = await page.getByTestId("flashcard-answer").evaluate((el) => el.getBoundingClientRect().top);
    expect(answerTop).toBeGreaterThanOrEqual(cardBox.y);
    const reachedBottom = await scroll.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) <= 1;
    });
    expect(reachedBottom).toBe(true);
  });
});

test.describe("Practice layout — desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await seedSession(page, STUB_DECK.id, ORIGINAL_ORDER);
  });

  test("desktop dimensions are unchanged", async ({ page }) => {
    await page.goto(`/practice/${STUB_DECK.id}`);
    const card = page.getByTestId("flashcard");
    await expect(card).toBeVisible();
    const cardBox = (await card.boundingBox())!;
    expect(cardBox.width).toBe(512);
    expect(cardBox.height).toBe(260);

    const panel = page.getByTestId("practice-panel");
    const panelStyle = await panel.evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopWidth, padding: getComputedStyle(el.firstElementChild!).paddingTop };
    });
    expect(panelStyle.border).toBe("1px");
    expect(panelStyle.padding).toBe("24px");

    // Default resizable panel width (768px) minus main's 16px side padding
    const panelBox = (await panel.boundingBox())!;
    expect(panelBox.width).toBe(768 - 32);
  });
});

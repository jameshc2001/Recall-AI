import { test, expect } from "@playwright/test";
import { seedDecks, seedSession, STUB_DECK } from "./fixtures";
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

    // Record the order all 3 cards appear in by marking each one
    const seen: string[] = [];
    for (let i = 0; i < STUB_DECK.cards.length - 1; i++) {
      for (const q of STUB_DECK.cards.map((c) => c.question)) {
        if (await page.getByText(q).isVisible()) { seen.push(q); break; }
      }
      await page.getByText(seen[seen.length - 1]).click();
      await page.getByRole("button", { name: "Correct", exact: true }).click();
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
    await page.getByText("Ask AI to fill this note").click();
    await page.getByPlaceholder("What should AI write?").fill("some prompt");
    await page.locator(".flex.flex-col.gap-2.rounded-xl").getByRole("button", { name: "Cancel" }).click();

    // AI panel gone, draft still intact
    await expect(page.getByPlaceholder("What should AI write?")).not.toBeVisible();
    await expect(page.getByPlaceholder("Add a note…")).toHaveValue("my draft");
  });
});

import { test, expect } from "@playwright/test";
import { seedDecks, STUB_DECK } from "./fixtures";
import type { Deck } from "@/lib/types";

test.describe("Practice page", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
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
    await expect(page.getByText(STUB_DECK.cards[0].question)).toBeVisible();
    await expect(page.getByText(`Card 1 of ${STUB_DECK.cards.length}`)).toBeVisible();
  });
});

test.describe("Card notes", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
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
    await page.goto(`/practice/${deckWithNote.id}`);
    await page.getByText(STUB_DECK.cards[0].question).click();
    await expect(page.getByText("Pre-existing note text")).toBeVisible();
  });
});

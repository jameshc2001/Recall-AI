import { test, expect } from "@playwright/test";
import { seedDecks, STUB_DECK } from "./fixtures";

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

import { test, expect } from "@playwright/test";
import { seedDecks, STUB_DECK } from "./fixtures";

test.describe("Home page", () => {
  test("shows empty state when no decks exist", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/no decks yet/i)).toBeVisible();
  });

  test("shows a list of saved decks", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    await expect(page.getByText(STUB_DECK.title)).toBeVisible();
    await expect(page.getByText(`${STUB_DECK.cards.length} cards`)).toBeVisible();
  });

  test("navigates to the create page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /new deck/i }).click();
    await expect(page).toHaveURL("/create");
  });

  test("navigates to practice mode", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    await page.getByRole("link", { name: /practice/i }).first().click();
    await expect(page).toHaveURL(`/practice/${STUB_DECK.id}`);
  });

  test("deletes a deck and it disappears from the list", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    await expect(page.getByText(STUB_DECK.title)).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).first().click();
    await page.getByRole("button", { name: "Confirm delete" }).first().click();
    await expect(page.getByText(STUB_DECK.title)).not.toBeVisible();
  });
});

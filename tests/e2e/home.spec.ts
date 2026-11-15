import { test, expect, seedDecks, seedSession, STUB_DECK } from "./fixtures";

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

  test("shows a loading skeleton while decks are being fetched", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    // Hold the decks request until the skeleton has been checked, then let the fake store answer it
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/api/store/decks", async (route) => {
      await held;
      await route.fallback();
    });
    await page.goto("/");
    await expect(page.getByRole("status", { name: /loading decks/i })).toBeVisible();
    await expect(page.getByText(/no decks yet/i)).toHaveCount(0);
    release();
    await expect(page.getByText(STUB_DECK.title)).toBeVisible();
    await expect(page.getByRole("status", { name: /loading decks/i })).toHaveCount(0);
  });

  test("shows an error if decks fail to load", async ({ page }) => {
    await page.route("**/api/store/decks", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("alert").filter({ hasText: /couldn.t load your decks/i })).toBeVisible();
    await expect(page.getByText(/no decks yet/i)).toHaveCount(0);
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
    // Generous timeout: under parallel load, next dev may still be compiling /practice
    await expect(page).toHaveURL(`/practice/${STUB_DECK.id}`, { timeout: 20_000 });
  });

  test("shows in-progress indicator when a session has completed cards", async ({ page }) => {
    const cardOrder = STUB_DECK.cards.map((c) => c.id);
    await seedDecks(page, [STUB_DECK]);
    await seedSession(page, STUB_DECK.id, cardOrder, {
      currentIndex: 1,
      results: ["correct"],
    });
    await page.goto("/");
    await expect(page.getByText("In progress")).toBeVisible();
    await expect(page.getByText(`1 / ${STUB_DECK.cards.length} cards`)).toBeVisible();
  });

  test("does not show in-progress indicator when no session exists", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    await expect(page.getByText("In progress")).not.toBeVisible();
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

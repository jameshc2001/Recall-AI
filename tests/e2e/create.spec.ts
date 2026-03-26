import { test, expect } from "@playwright/test";
import { STUB_DECK_RESPONSE_CONTENT } from "./fixtures";

/** Intercept POST /api/chat and return a canned assistant response. */
function stubChat(page: import("@playwright/test").Page, content: string) {
  return page.route("/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ role: "assistant", content }),
    });
  });
}

const GREETING = "Hi! I'm here to help you build a flashcard deck. What topic would you like to study?";
const CONFIRM = "Got it — 3 JavaScript cards at beginner difficulty. Ready to generate?";

test.describe("Create page", () => {
  test("shows the assistant greeting on load", async ({ page }) => {
    await stubChat(page, GREETING);
    await page.goto("/create");
    await expect(page.getByText(GREETING)).toBeVisible();
  });

  test("sends user message and shows assistant reply", async ({ page }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;
      const response = callCount === 1 ? GREETING : CONFIRM;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "assistant", content: response }),
      });
    });

    await page.goto("/create");
    await expect(page.getByText(GREETING)).toBeVisible();

    await page.getByRole("textbox").fill("JavaScript");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page.getByText(CONFIRM)).toBeVisible();
  });

  test("shows deck-ready UI when Claude returns a deck JSON", async ({ page }) => {
    await stubChat(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await expect(page.getByText(/cards ready/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /save deck/i })).toBeVisible();
  });

  test("saves deck and redirects to home", async ({ page }) => {
    await stubChat(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await expect(page.getByRole("button", { name: /save deck/i })).toBeVisible();
    await page.getByRole("button", { name: /save deck/i }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("JavaScript Basics")).toBeVisible();
  });

  test("discarding navigates back to home without saving", async ({ page }) => {
    await stubChat(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await expect(page.getByRole("link", { name: /discard/i })).toBeVisible();
    await page.getByRole("link", { name: /discard/i }).click();
    await expect(page).toHaveURL("/");
    // Deck should not have been saved
    await expect(page.getByText("JavaScript Basics")).not.toBeVisible();
  });

  test("shows error message when API call fails", async ({ page }) => {
    await page.route("/api/chat", (route) => route.abort());
    await page.goto("/create");
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });
});

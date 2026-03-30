import { test, expect } from "@playwright/test";
import { STUB_DECK_RESPONSE_CONTENT } from "./fixtures";

const REASONING =
  "A beginner JavaScript deck for a fun quiz works best with around 10 focused cards.";

function stubRecommend(page: import("@playwright/test").Page, count = 10) {
  return page.route("/api/recommend", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count, reasoning: REASONING }),
    });
  });
}

function stubGenerate(page: import("@playwright/test").Page, content: string) {
  return page.route("/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ role: "assistant", content }),
    });
  });
}

test.describe("Create page", () => {
  test("shows description form on load", async ({ page }) => {
    await page.goto("/create");
    await expect(page.getByRole("textbox")).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("continue button is disabled when description is empty", async ({ page }) => {
    await page.goto("/create");
    await expect(page.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  test("submitting description shows card count picker with AI recommendation", async ({
    page,
  }) => {
    await stubRecommend(page, 10);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics for a fun quiz");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await expect(page.getByRole("button", { name: /generate deck/i })).toBeVisible();
  });

  test("recommended count is pre-selected so generate button is enabled", async ({ page }) => {
    await stubRecommend(page, 10);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics for a fun quiz");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await expect(page.getByRole("button", { name: /generate deck/i })).toBeEnabled();
  });

  test("user can select a different card count", async ({ page }) => {
    await stubRecommend(page, 10);
    await stubGenerate(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await page.getByRole("button", { name: /^20/ }).click();
    await page.getByRole("button", { name: /generate deck/i }).click();
    await expect(page.getByText(/cards ready/i)).toBeVisible();
  });

  test("shows deck-ready UI when deck is generated", async ({ page }) => {
    await stubRecommend(page);
    await stubGenerate(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics for a fun quiz");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await page.getByRole("button", { name: /generate deck/i }).click();
    await expect(page.getByText(/cards ready/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /save deck/i })).toBeVisible();
  });

  test("saves deck and redirects to home", async ({ page }) => {
    await stubRecommend(page);
    await stubGenerate(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await page.getByRole("button", { name: /generate deck/i }).click();
    await expect(page.getByRole("button", { name: /save deck/i })).toBeVisible();
    await page.getByRole("button", { name: /save deck/i }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("JavaScript Basics")).toBeVisible();
  });

  test("discarding navigates back to home without saving", async ({ page }) => {
    await stubRecommend(page);
    await stubGenerate(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await page.getByRole("button", { name: /generate deck/i }).click();
    await expect(page.getByRole("link", { name: /discard/i })).toBeVisible();
    await page.getByRole("link", { name: /discard/i }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("JavaScript Basics")).not.toBeVisible();
  });

  test("back button on count step returns to form", async ({ page }) => {
    await stubRecommend(page);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByRole("textbox")).toBeVisible();
  });

  test("shows slow-generation warning when count >= 20", async ({ page }) => {
    await stubRecommend(page, 20);
    // Delay the response so the generating screen stays visible long enough to assert
    await page.route("/api/chat", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "assistant", content: STUB_DECK_RESPONSE_CONTENT }),
      });
    });
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await page.getByRole("button", { name: /generate deck/i }).click();
    await expect(page.getByText(/minute/i)).toBeVisible();
  });

  test("does not show slow-generation warning when count < 20", async ({ page }) => {
    await stubRecommend(page, 10);
    await stubGenerate(page, STUB_DECK_RESPONSE_CONTENT);
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(REASONING)).toBeVisible();
    await page.getByRole("button", { name: /generate deck/i }).click();
    await expect(page.getByText(/minute/i)).not.toBeVisible();
  });

  test("shows error when recommend API fails", async ({ page }) => {
    await page.route("/api/recommend", (route) => route.abort());
    await page.goto("/create");
    await page.getByRole("textbox").fill("JavaScript basics");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });
});

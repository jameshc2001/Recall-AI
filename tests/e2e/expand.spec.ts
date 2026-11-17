import { test, expect, STUB_DECK, seedDecks, seedSession, getStoredDecks, getStoredSession } from "./fixtures";
import type { Page } from "@playwright/test";

const NEW_CARDS = [
  { question: "What is a promise?", answer: "An object representing a future value." },
  { question: "What does await do?", answer: "Pauses an async function until a promise settles." },
];

const EXPAND_RESPONSE = `Here are your new cards!\n\`\`\`json\n${JSON.stringify({ cards: NEW_CARDS })}\n\`\`\``;

async function stubExpand(page: Page, response: { status?: number; json: unknown }) {
  const requests: unknown[] = [];
  await page.route("**/api/expand", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: response.status ?? 200, json: response.json });
  });
  return requests;
}

async function openExpand(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Expand" }).click();
  return page.getByRole("dialog", { name: "Expand deck" });
}

test.describe("Expand deck", () => {
  test.beforeEach(async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
  });

  test("generates, previews and adds new cards", async ({ page }) => {
    const requests = await stubExpand(page, { json: { content: EXPAND_RESPONSE } });
    const dialog = await openExpand(page);

    await dialog.getByRole("textbox").fill("Add cards on promises and async/await");
    await dialog.getByRole("button", { name: "Generate" }).click();

    await expect(dialog.getByText("What is a promise?")).toBeVisible();
    await expect(dialog.getByText("What does await do?")).toBeVisible();
    expect(requests[0]).toEqual({ deckId: STUB_DECK.id, request: "Add cards on promises and async/await" });

    await dialog.getByRole("button", { name: "Add 2 cards" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("5 cards")).toBeVisible();

    const saved = getStoredDecks(page)[0];
    expect(saved.cards).toHaveLength(5);
    expect(saved.cards.slice(0, 3)).toEqual(STUB_DECK.cards);
    expect(saved.cards.slice(3).map((c) => c.question)).toEqual(NEW_CARDS.map((c) => c.question));
    expect(new Set(saved.cards.map((c) => c.id)).size).toBe(5);
  });

  test("Back returns to the form with the request kept, and Cancel saves nothing", async ({ page }) => {
    await stubExpand(page, { json: { content: EXPAND_RESPONSE } });
    const dialog = await openExpand(page);

    await dialog.getByRole("textbox").fill("Add cards on promises");
    await dialog.getByRole("button", { name: "Generate" }).click();
    await expect(dialog.getByRole("button", { name: "Add 2 cards" })).toBeVisible();

    await dialog.getByRole("button", { name: "Back" }).click();
    await expect(dialog.getByRole("textbox")).toHaveValue("Add cards on promises");

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    expect(getStoredDecks(page)[0].cards).toHaveLength(3);
    await expect(page.getByText("3 cards")).toBeVisible();
  });

  test("Escape closes the dialog", async ({ page }) => {
    const dialog = await openExpand(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("shows an error when the API fails", async ({ page }) => {
    await stubExpand(page, { status: 422, json: { error: "Claude declined this request" } });
    const dialog = await openExpand(page);

    await dialog.getByRole("textbox").fill("Add cards");
    await dialog.getByRole("button", { name: "Generate" }).click();

    await expect(dialog.getByRole("alert")).toHaveText("Claude declined this request");
    await expect(dialog.getByRole("textbox")).toHaveValue("Add cards");
    expect(getStoredDecks(page)[0].cards).toHaveLength(3);
  });

  test("shows an error when the response can't be parsed", async ({ page }) => {
    await stubExpand(page, { json: { content: "Sorry, no JSON here" } });
    const dialog = await openExpand(page);

    await dialog.getByRole("textbox").fill("Add cards");
    await dialog.getByRole("button", { name: "Generate" }).click();

    await expect(dialog.getByRole("alert")).toContainText("Couldn't read the generated cards");
  });

  test("appends new card ids to an in-progress session", async ({ page }) => {
    await seedSession(page, STUB_DECK.id, ["c2", "c1", "c3"], { currentIndex: 1, results: ["correct"] });
    await stubExpand(page, { json: { content: EXPAND_RESPONSE } });
    const dialog = await openExpand(page);

    await dialog.getByRole("textbox").fill("Add cards on promises");
    await dialog.getByRole("button", { name: "Generate" }).click();
    await dialog.getByRole("button", { name: "Add 2 cards" }).click();
    await expect(dialog).toBeHidden();

    const newIds = getStoredDecks(page)[0].cards.slice(3).map((c) => c.id);
    expect(getStoredSession(page, STUB_DECK.id)).toEqual({
      currentIndex: 1,
      results: ["correct"],
      cardOrder: ["c2", "c1", "c3", ...newIds],
    });
    // Progress on the tile reflects the larger deck
    await expect(page.getByText("1 / 5 cards")).toBeVisible();
  });
});

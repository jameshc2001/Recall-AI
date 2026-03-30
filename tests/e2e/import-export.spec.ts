import { test, expect } from "@playwright/test";
import {
  seedDecks,
  seedSession,
  STUB_DECK,
  STUB_EXPORT_FILE,
  STUB_EXPORT_FILE_WITH_SESSION,
} from "./fixtures";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
test.describe("Export", () => {
  test("Export button is visible on a deck card", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  });

  test("clicking Export downloads a .json file", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test("exported file has version 1 and the correct deck id", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    const path = await download.path();
    const fs = await import("fs/promises");
    const raw = JSON.parse(await fs.readFile(path!, "utf-8"));
    expect(raw.version).toBe(1);
    expect(raw.deck.id).toBe(STUB_DECK.id);
    expect(raw.deck.title).toBe(STUB_DECK.title);
  });

  test("exported session is null when no session exists", async ({ page }) => {
    await seedDecks(page, [STUB_DECK]);
    await page.goto("/");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    const path = await download.path();
    const fs = await import("fs/promises");
    const raw = JSON.parse(await fs.readFile(path!, "utf-8"));
    expect(raw.session).toBeNull();
  });

  test("exported file includes session data when a session is active", async ({ page }) => {
    const cardOrder = STUB_DECK.cards.map((c) => c.id);
    await seedDecks(page, [STUB_DECK]);
    await seedSession(page, STUB_DECK.id, cardOrder, { currentIndex: 1, results: [true] });
    await page.goto("/");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export" }).click(),
    ]);
    const path = await download.path();
    const fs = await import("fs/promises");
    const raw = JSON.parse(await fs.readFile(path!, "utf-8"));
    expect(raw.session).not.toBeNull();
    expect(raw.session.currentIndex).toBe(1);
    expect(raw.session.cardOrder).toEqual(cardOrder);
  });
});

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------
test.describe("Import", () => {
  async function importFile(
    page: import("@playwright/test").Page,
    content: object,
    filename = "deck.json"
  ) {
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /import/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: filename,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(content)),
    });
  }

  test("Import button is visible on the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /import/i })).toBeVisible();
  });

  // BACKWARDS COMPAT: v1 — a minimal v1 export (no notes, no session) must import successfully
  test("importing a valid v1 export file adds the deck to the list", async ({ page }) => {
    await page.goto("/");
    await importFile(page, STUB_EXPORT_FILE);
    await expect(page.getByText(STUB_DECK.title)).toBeVisible();
    await expect(page.getByText(`${STUB_DECK.cards.length} cards`)).toBeVisible();
  });

  test("importing the same file twice creates two separate deck entries", async ({ page }) => {
    await page.goto("/");
    await importFile(page, STUB_EXPORT_FILE);
    await importFile(page, STUB_EXPORT_FILE);
    await expect(page.getByText(STUB_DECK.title)).toHaveCount(2);
  });

  test("imported deck with a session shows the in-progress indicator", async ({ page }) => {
    await page.goto("/");
    await importFile(page, STUB_EXPORT_FILE_WITH_SESSION);
    await expect(page.getByText("In progress")).toBeVisible();
  });

  test("uploading an invalid JSON file shows an error", async ({ page }) => {
    await page.goto("/");
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /import/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("not valid json {{{{"),
    });
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(/valid json/i);
  });

  test("uploading a wrong-shape JSON file shows an error", async ({ page }) => {
    await page.goto("/");
    await importFile(page, { something: "wrong" });
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("error is cleared after a successful import follows a failed one", async ({ page }) => {
    await page.goto("/");
    // trigger an error
    await importFile(page, { something: "wrong" });
    await expect(page.getByRole("alert")).toBeVisible();
    // now import a valid file
    await importFile(page, STUB_EXPORT_FILE);
    await expect(page.getByRole("alert")).not.toBeVisible();
  });
});

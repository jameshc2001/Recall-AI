import { test, expect } from "@playwright/test";

test.describe("dark mode toggle", () => {
  test("toggle button is present on home page", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Toggle dark mode" });
    await expect(toggle).toBeVisible();
  });

  test("clicking toggle adds dark class to html element", async ({ page }) => {
    // Start from a known light state
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    });

    const toggle = page.getByRole("button", { name: "Toggle dark mode" });
    await toggle.click();

    const hasDark = await page.evaluate(
      () => document.documentElement.classList.contains("dark")
    );
    expect(hasDark).toBe(true);

    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");
  });

  test("clicking toggle twice returns to light mode", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    });

    const toggle = page.getByRole("button", { name: "Toggle dark mode" });
    await toggle.click();
    await toggle.click();

    const hasDark = await page.evaluate(
      () => document.documentElement.classList.contains("dark")
    );
    expect(hasDark).toBe(false);

    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("light");
  });

  test("dark preference persists across page navigation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    });

    await page.getByRole("button", { name: "Toggle dark mode" }).click();

    // Navigate away and back — FOUC script should restore dark class
    await page.goto("/");

    const hasDark = await page.evaluate(
      () => document.documentElement.classList.contains("dark")
    );
    expect(hasDark).toBe(true);
  });
});

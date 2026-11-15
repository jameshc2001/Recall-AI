import { test, expect, E2E_ADMIN_PASSWORD } from "./fixtures";

test.describe("Authentication", () => {
  test.use({ loggedIn: false });

  test("redirects unauthenticated page requests to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("rejects unauthenticated API requests with 401", async ({ page }) => {
    const res = await page.request.post("/api/note", {
      data: { question: "q", answer: "a", prompt: "p" },
    });
    expect(res.status()).toBe(401);
  });

  test("logging in with the correct password lands on the home page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password/i).fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    // Generous timeout: under parallel load, next dev may still be compiling /
    await expect(page).toHaveURL("/", { timeout: 20_000 });
  });
});

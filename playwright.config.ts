import { defineConfig, devices } from "@playwright/test";

// E2E runs its own dev server on a dedicated port with throwaway auth secrets.
// No real secrets are needed: /api/store/* is replaced by an in-memory fake in
// tests/e2e/fixtures.ts, and all Claude routes are stubbed per test.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `${BASE_URL}/login`,
    // Never reuse: an already-running server won't have the test env below
    reuseExistingServer: false,
    env: {
      // Must match E2E_ADMIN_PASSWORD in tests/e2e/fixtures.ts
      ADMIN_PASSWORD: "e2e-test-password",
      SESSION_SECRET: "e2e-only-session-secret-not-used-anywhere-else-0123456789",
      // Safety net: if a store route is ever left unstubbed, fail fast instead of
      // touching real data (process env overrides any values in .env.local).
      KV_REST_API_URL: "http://127.0.0.1:9",
      KV_REST_API_TOKEN: "e2e-invalid-token",
      ANTHROPIC_API_KEY: "e2e-invalid-key",
    },
    timeout: 120_000,
  },
});

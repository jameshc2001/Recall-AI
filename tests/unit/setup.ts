// jsdom doesn't include crypto.randomUUID — polyfill it
import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "test-uuid-1234",
  },
});

// Reset localStorage between tests
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Node 22.4+ ships a built-in localStorage global (enabled by default from Node 25)
// that shadows jsdom's and is unusable without --localstorage-file. Disable it in
// the test workers so jsdom's localStorage is used.
const [major, minor] = process.versions.node.split(".").map(Number);
const hasWebStorageFlag = major > 22 || (major === 22 && minor >= 4);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    execArgv: hasWebStorageFlag ? ["--no-experimental-webstorage"] : [],
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only throws in jsdom — replace with a no-op in tests
      "server-only": path.resolve(__dirname, "tests/unit/__mocks__/server-only.ts"),
    },
  },
});

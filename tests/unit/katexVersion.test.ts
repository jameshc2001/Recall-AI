import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

// CardNote imports "katex/dist/katex.min.css" from the top-level katex package,
// but the markup is produced by whichever katex rehype-katex resolves. If they
// differ, the CSS doesn't match the HTML and fractions/subscripts overlap.
describe("katex version alignment", () => {
  it("rehype-katex renders with the same katex version whose CSS we import", () => {
    const req = createRequire(import.meta.url);
    const topLevel = req("katex/package.json").version;
    const fromRehype = createRequire(req.resolve("rehype-katex"))("katex/package.json").version;
    expect(fromRehype).toBe(topLevel);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: function Anthropic() {
      return { messages: { create: mockCreate } };
    },
  };
});

async function makeRequest(body: unknown) {
  const { POST } = await import("@/app/api/note/route");
  const req = new NextRequest("http://localhost/api/note", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req);
}

const validBody = {
  question: "What is a closure?",
  answer: "A function that captures variables from its surrounding scope.",
  prompt: "Explain with examples",
};

describe("POST /api/note", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "## Closures\n\nA closure is..." }],
    });
  });

  it("calls Claude with max_tokens of at least 4096", async () => {
    await makeRequest(validBody);
    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.max_tokens).toBeGreaterThanOrEqual(4096);
  });

  it("returns the generated note content", async () => {
    const res = await makeRequest(validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("## Closures\n\nA closure is...");
  });

  it("rejects missing question", async () => {
    const res = await makeRequest({ answer: "x", prompt: "x" });
    expect(res.status).toBe(400);
  });

  it("rejects missing answer", async () => {
    const res = await makeRequest({ question: "x", prompt: "x" });
    expect(res.status).toBe(400);
  });

  it("rejects missing prompt", async () => {
    const res = await makeRequest({ question: "x", answer: "x" });
    expect(res.status).toBe(400);
  });

  it("rejects prompt over 500 chars", async () => {
    const res = await makeRequest({ ...validBody, prompt: "a".repeat(501) });
    expect(res.status).toBe(400);
  });
});

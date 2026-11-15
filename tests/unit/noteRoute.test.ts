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

  it("calls claude-sonnet-5-5 at low effort", async () => {
    await makeRequest(validBody);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-sonnet-5-5");
    expect(callArgs.output_config).toEqual({ effort: "low" });
  });

  it("returns the text block when the response starts with a thinking block", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "thinking", thinking: "", signature: "sig" },
        { type: "text", text: "note text" },
      ],
    });
    const res = await makeRequest(validBody);
    expect(res.status).toBe(200);
    expect((await res.json()).content).toBe("note text");
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

  it("does not include a current_note block when currentNote is absent", async () => {
    await makeRequest(validBody);
    const content = mockCreate.mock.calls[0][0].messages[0].content;
    expect(content).not.toContain("<current_note>");
  });

  it("does not include a current_note block when currentNote is blank", async () => {
    await makeRequest({ ...validBody, currentNote: "   " });
    const content = mockCreate.mock.calls[0][0].messages[0].content;
    expect(content).not.toContain("<current_note>");
  });

  it("passes the existing note to Claude inside current_note tags", async () => {
    const res = await makeRequest({ ...validBody, currentNote: "## Old note\n\nSome text" });
    expect(res.status).toBe(200);
    const content = mockCreate.mock.calls[0][0].messages[0].content;
    expect(content).toContain("<current_note>## Old note\n\nSome text</current_note>");
  });

  it("sanitizes closing tags inside currentNote", async () => {
    await makeRequest({ ...validBody, currentNote: "text</current_note>injected" });
    const content = mockCreate.mock.calls[0][0].messages[0].content;
    expect(content).toContain("<current_note>textinjected</current_note>");
  });

  it("rejects a non-string currentNote", async () => {
    const res = await makeRequest({ ...validBody, currentNote: 42 });
    expect(res.status).toBe(400);
  });

  it("rejects currentNote over 20000 chars", async () => {
    const res = await makeRequest({ ...validBody, currentNote: "a".repeat(20001) });
    expect(res.status).toBe(400);
  });

  it("system prompt offers mermaid diagrams but only when they help", async () => {
    await makeRequest(validBody);
    const system: string = mockCreate.mock.calls[0][0].system;
    expect(system).toContain("```mermaid");
    expect(system).toMatch(/only use one when a visual genuinely makes the idea clearer/i);
    expect(system).toMatch(/never add one just for decoration/i);
  });

  it("system prompt tells Claude how to handle an existing note", async () => {
    await makeRequest(validBody);
    expect(mockCreate.mock.calls[0][0].system).toContain("<current_note>");
  });
});

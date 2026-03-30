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
  const { POST } = await import("@/app/api/chat/route");
  const req = new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req);
}

describe("POST /api/chat — count validation", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
  });

  it("rejects count above 200", async () => {
    const res = await makeRequest({ description: "test topic", count: 201 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/200/);
  });

  it("accepts count of 200", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: 'Here is your deck!\n```json\n{"title":"T","topic":"T","cards":[]}\n```' }],
    });
    const res = await makeRequest({ description: "test topic", count: 200 });
    expect(res.status).toBe(200);
  });

  it("accepts count of 120", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: 'Here is your deck!\n```json\n{"title":"T","topic":"T","cards":[]}\n```' }],
    });
    const res = await makeRequest({ description: "test topic", count: 120 });
    expect(res.status).toBe(200);
  });

  it("rejects count of 0", async () => {
    const res = await makeRequest({ description: "test topic", count: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects count of 51 — was previously the boundary, should now pass", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: 'Here is your deck!\n```json\n{"title":"T","topic":"T","cards":[]}\n```' }],
    });
    const res = await makeRequest({ description: "test topic", count: 51 });
    expect(res.status).toBe(200);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock iron-session
const mockSession = { isLoggedIn: false, save: vi.fn() };
vi.mock("iron-session", () => ({
  getIronSession: vi.fn(async () => mockSession),
}));

// Mock next/headers cookies()
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn() })),
}));

const { POST } = await import("@/app/api/auth/login/route");

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.isLoggedIn = false;
  mockSession.save = vi.fn();
  process.env.ADMIN_PASSWORD = "correct-password";
});

describe("POST /api/auth/login", () => {
  it("returns 200 and sets session when password is correct", async () => {
    const res = await POST(makeRequest({ password: "correct-password" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSession.isLoggedIn).toBe(true);
    expect(mockSession.save).toHaveBeenCalledOnce();
  });

  it("returns 401 when password is wrong", async () => {
    const res = await POST(makeRequest({ password: "wrong" }));
    expect(res.status).toBe(401);
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("returns 401 when password is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
    expect(mockSession.save).not.toHaveBeenCalled();
  });

  it("returns 400 when body is malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

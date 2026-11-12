import { describe, it, expect } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, LOW_EFFORT, getResponseText } from "@/lib/claude";

function message(partial: { content: unknown[]; stop_reason?: string }): Anthropic.Message {
  return { stop_reason: "end_turn", ...partial } as unknown as Anthropic.Message;
}

describe("lib/claude", () => {
  it("uses Claude Sonnet 5.5", () => {
    expect(CLAUDE_MODEL).toBe("claude-sonnet-5-5");
  });

  it("requests low effort via output_config", () => {
    expect(LOW_EFFORT).toEqual({ output_config: { effort: "low" } });
  });

  it("returns the text of a plain text response", () => {
    expect(getResponseText(message({ content: [{ type: "text", text: "hi" }] }))).toEqual({
      ok: true,
      text: "hi",
    });
  });

  it("skips a leading thinking block and returns the text block", () => {
    const res = message({
      content: [
        { type: "thinking", thinking: "", signature: "sig" },
        { type: "text", text: "answer" },
      ],
    });
    expect(getResponseText(res)).toEqual({ ok: true, text: "answer" });
  });

  it("reports a refusal with status 422", () => {
    const res = message({ content: [], stop_reason: "refusal" });
    expect(getResponseText(res)).toEqual({
      ok: false,
      status: 422,
      error: "Claude declined this request",
    });
  });

  it("reports a missing text block with status 500", () => {
    const res = message({ content: [{ type: "thinking", thinking: "", signature: "sig" }] });
    expect(getResponseText(res)).toEqual({
      ok: false,
      status: 500,
      error: "Unexpected response type",
    });
  });
});

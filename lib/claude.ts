import type Anthropic from "@anthropic-ai/sdk";

/** Single source of truth for the Claude model used by every API route. */
export const CLAUDE_MODEL = "claude-sonnet-5-5";

/**
 * Low effort suits these short generation/classification tasks: the model skips
 * thinking on most requests, keeping latency and token spend down.
 * Cast because the pinned SDK (0.39) predates `output_config` in its typings —
 * the SDK forwards the field unchanged. Remove the cast after upgrading the SDK.
 */
export const LOW_EFFORT = { output_config: { effort: "low" } } as Record<string, unknown>;

export type ClaudeTextResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string };

/**
 * Extracts the text reply from a Claude response.
 * Sonnet 5.5 thinks by default, so a response can begin with a `thinking` block —
 * find the text block by type rather than reading `content[0]`.
 */
export function getResponseText(response: Anthropic.Message): ClaudeTextResult {
  // "refusal" is not in the 0.39 SDK's stop_reason union, hence the widening cast.
  if ((response.stop_reason as string | null) === "refusal") {
    return { ok: false, status: 422, error: "Claude declined this request" };
  }
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) {
    return { ok: false, status: 500, error: "Unexpected response type" };
  }
  return { ok: true, text: textBlock.text };
}

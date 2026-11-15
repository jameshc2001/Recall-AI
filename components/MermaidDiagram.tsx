"use client";

import { useEffect, useId, useState } from "react";

interface Props {
  chart: string;
  isDark: boolean;
}

type State =
  | { status: "loading" }
  | { status: "ready"; svg: string }
  | { status: "error" };

/**
 * Renders a Mermaid diagram from a ```mermaid fenced block in a card note.
 * Mermaid is large, so it is imported lazily — notes without diagrams never load it.
 */
export default function MermaidDiagram({ chart, isDark }: Props) {
  // Mermaid uses the id as a DOM id/CSS selector, so strip useId's colons etc.
  const id = "mermaid-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          // Note content is AI/user-provided: sanitize labels, no click handlers or HTML labels
          securityLevel: "strict",
          theme: isDark ? "dark" : "default",
        });
        // Validate first so invalid syntax falls back cleanly instead of Mermaid
        // injecting its own error SVG into the page
        const valid = await mermaid.parse(chart, { suppressErrors: true });
        if (!valid) {
          if (!cancelled) setState({ status: "error" });
          return;
        }
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setState({ status: "ready", svg });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    draw();
    return () => {
      cancelled = true;
    };
  }, [chart, isDark, id]);

  if (state.status === "error") {
    return (
      <div className="my-2" data-testid="mermaid-fallback">
        <pre className="overflow-x-auto bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg p-3 text-sm font-mono whitespace-pre">
          {chart}
        </pre>
        <p className="mt-1 text-xs text-neutral-400">Couldn&apos;t render diagram</p>
      </div>
    );
  }

  if (state.status === "loading") {
    return <div className="my-2 min-h-24" aria-busy="true" data-testid="mermaid-loading" />;
  }

  return (
    <div
      className="my-2 overflow-x-auto flex justify-center"
      data-testid="mermaid-diagram"
      // SVG comes from mermaid.render with securityLevel "strict" (DOMPurify-sanitized)
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}

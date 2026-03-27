"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  cardId: string;
  initialNote: string | undefined;
  onSave: (note: string) => void;
}

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-semibold mb-1.5 mt-3 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-medium mb-1 mt-2 first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-neutral-300 dark:border-neutral-600 pl-3 italic text-neutral-600 dark:text-neutral-400 my-2">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <pre className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg overflow-x-auto text-sm my-2">
          <code className="font-mono">{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export default function CardNote({ initialNote, onSave }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState(initialNote ?? "");
  const [saved, setSaved] = useState(initialNote ?? "");

  function handleSave() {
    setSaved(draft);
    onSave(draft);
    setMode("view");
  }

  function handleCancel() {
    setDraft(saved);
    setMode("view");
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {mode === "edit" ? (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note… Markdown supported"
            rows={6}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 p-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 placeholder:text-neutral-400"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
            >
              Save note
            </button>
          </div>
        </div>
      ) : saved ? (
        <div className="relative group">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 text-sm text-neutral-700 dark:text-neutral-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {saved}
            </ReactMarkdown>
          </div>
          <button
            onClick={() => { setDraft(saved); setMode("edit"); }}
            className="absolute top-2 right-2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors opacity-0 group-hover:opacity-100 bg-white dark:bg-neutral-800 px-2 py-1 rounded"
          >
            Edit
          </button>
        </div>
      ) : (
        <button
          onClick={() => setMode("edit")}
          className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors flex items-center gap-1"
        >
          <span>+</span>
          <span>Add a note</span>
        </button>
      )}
    </div>
  );
}

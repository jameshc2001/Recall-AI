"use client";

import { useEffect, useState, Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  cardId: string;
  question: string;
  answer: string;
  initialNote: string | undefined;
  onSave: (note: string) => void;
}

export default function CardNote({ question, answer, initialNote, onSave }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState(initialNote ?? "");
  const [saved, setSaved] = useState(initialNote ?? "");

  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
      const lang = /language-(\w+)/.exec(className ?? "")?.[1];
      if (lang) {
        return (
          <SyntaxHighlighter
            language={lang}
            style={isDark ? vscDarkPlus : vs}
            customStyle={{ borderRadius: "0.5rem", fontSize: "0.875rem", margin: "0.5rem 0" }}
            PreTag="div"
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        );
      }
      return (
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    pre: ({ children }) => {
      const codeChild = Children.toArray(children).find(
        (c): c is React.ReactElement => isValidElement(c)
      );
      if (!codeChild) return <>{children}</>;
      const className = (codeChild.props as { className?: string }).className ?? "";
      if (/language-\w+/.test(className)) return <>{children}</>;
      return (
        <pre className="overflow-x-auto bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg p-3 my-2 text-sm font-mono whitespace-pre">
          {(codeChild.props as { children: React.ReactNode }).children}
        </pre>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-neutral-100 dark:bg-neutral-800">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-neutral-200 dark:border-neutral-700 last:border-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="text-left font-semibold px-3 py-2 border border-neutral-200 dark:border-neutral-700">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 align-top">
        {children}
      </td>
    ),
  };

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function handleSave() {
    setSaved(draft);
    onSave(draft);
    setMode("view");
  }

  function handleCancel() {
    setDraft(saved);
    setAiOpen(false);
    setAiPrompt("");
    setAiError("");
    setMode("view");
  }

  async function handleAiFill() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, prompt: aiPrompt.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      const data = await res.json();
      setDraft(data.content ?? "");
      setAiOpen(false);
      setAiPrompt("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="w-full">
      {mode === "edit" ? (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note… Markdown supported"
            rows={6}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 p-3 font-mono resize-y max-h-64 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 placeholder:text-neutral-400"
          />

          {/* AI fill section */}
          {aiOpen ? (
            <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Tell AI what to write — e.g. &ldquo;explain with examples&rdquo;, &ldquo;add a mnemonic&rdquo;, &ldquo;compare with a table&rdquo;
              </p>
              <textarea
                autoFocus
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAiFill();
                  if (e.key === "Escape") { setAiOpen(false); setAiPrompt(""); setAiError(""); }
                }}
                placeholder="What should AI write?"
                rows={2}
                maxLength={500}
                disabled={aiLoading}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-800 dark:text-neutral-100 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 placeholder:text-neutral-400 disabled:opacity-50"
              />
              {aiError && (
                <p className="text-xs text-red-500 dark:text-red-400">{aiError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setAiOpen(false); setAiPrompt(""); setAiError(""); }}
                  disabled={aiLoading}
                  className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors px-2 py-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAiFill}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
                >
                  {aiLoading ? (
                    <>
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generating…
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAiOpen(true)}
              className="self-start text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors flex items-center gap-1"
            >
              <span>✦</span>
              <span>Ask AI to fill this note</span>
            </button>
          )}

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

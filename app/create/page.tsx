"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { parseDeckFromMessage } from "@/lib/deckParser";
import { saveDeck } from "@/lib/storage";
import DeckGeneratingLoader from "@/components/DeckGeneratingLoader";

type Step = "form" | "count" | "generating" | "ready";

const BASE_COUNT_OPTIONS = [5, 10, 15, 20, 30, 50];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedCount, setRecommendedCount] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [readyDeck, setReadyDeck] = useState<Deck | null>(null);
  const [error, setError] = useState("");

  // Include recommended count in options if it falls outside the presets
  const countOptions =
    recommendedCount && !BASE_COUNT_OPTIONS.includes(recommendedCount)
      ? [...BASE_COUNT_OPTIONS, recommendedCount].sort((a, b) => a - b)
      : BASE_COUNT_OPTIONS;

  async function handleDescriptionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || isLoading) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data: { count: number; reasoning: string } = await res.json();
      setRecommendedCount(data.count);
      setSelectedCount(data.count);
      setReasoning(data.reasoning);
      setStep("count");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedCount || isLoading) return;
    setError("");
    setIsLoading(true);
    setStep("generating");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), count: selectedCount }),
      });
      const data: { role: "assistant"; content: string } = await res.json();
      const deck = parseDeckFromMessage(data.content);
      if (deck) {
        setReadyDeck(deck);
        setStep("ready");
      } else {
        setError("Failed to parse the deck. Please try again.");
        setStep("count");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("count");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSaveDeck() {
    if (!readyDeck) return;
    saveDeck(readyDeck);
    router.push("/");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="text-neutral-400 hover:text-neutral-700 text-sm transition-colors dark:hover:text-neutral-300"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Create a deck</h1>
      </div>

      {step === "form" && (
        <form onSubmit={handleDescriptionSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
            >
              What deck do you want to create?
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Beginner Python for someone learning to code for the first time — just the basics, for a fun quiz"
              rows={4}
              className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-300 resize-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:focus:ring-neutral-600 dark:placeholder-neutral-500"
            />
            <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              Include the{" "}
              <strong className="text-neutral-500 dark:text-neutral-400">topic</strong>, your{" "}
              <strong className="text-neutral-500 dark:text-neutral-400">goal</strong> (fun quiz,
              deep learning, exam prep…), and{" "}
              <strong className="text-neutral-500 dark:text-neutral-400">difficulty level</strong>.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!description.trim() || isLoading}
            className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {isLoading ? "Thinking…" : "Continue →"}
          </button>
        </form>
      )}

      {step === "count" && (
        <div className="space-y-7">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 dark:bg-neutral-900 dark:border-neutral-700">
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1">
              AI recommendation
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{reasoning}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              How many cards?
            </p>
            <div className="flex flex-wrap gap-2">
              {countOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setSelectedCount(n)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedCount === n
                      ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                      : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                  }`}
                >
                  {n}
                  {n === recommendedCount && (
                    <span className="ml-1.5 text-xs opacity-50">★</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={!selectedCount}
              className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Generate deck
            </button>
            <button
              onClick={() => {
                setStep("form");
                setError("");
              }}
              className="text-sm text-neutral-500 border border-neutral-200 px-6 py-2.5 rounded-lg hover:border-neutral-400 transition-colors dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === "generating" && (
        <div
          className="border border-neutral-200 rounded-2xl bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
          style={{ height: "360px" }}
        >
          <DeckGeneratingLoader />
        </div>
      )}

      {step === "ready" && readyDeck && (
        <div className="border border-neutral-200 rounded-2xl bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex flex-col items-center justify-center gap-6 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl dark:bg-green-900/40">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">{readyDeck.title}</h2>
              <p className="text-neutral-500 text-sm">{readyDeck.cards.length} cards ready</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDeck}
                className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                Save deck
              </button>
              <Link
                href="/"
                className="text-sm text-neutral-500 border border-neutral-200 px-6 py-2.5 rounded-lg hover:border-neutral-400 transition-colors dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500"
              >
                Discard
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

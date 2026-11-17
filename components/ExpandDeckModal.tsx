"use client";

import { useEffect, useState } from "react";
import { Card, Deck } from "@/lib/types";
import { parseNewCardsFromMessage } from "@/lib/deckParser";
import { updateDeck, getSession, saveSession } from "@/lib/clientStorage";

interface Props {
  deck: Deck;
  onClose: () => void;
  onUpdated: (deck: Deck) => void;
}

type Step = "form" | "generating" | "preview" | "saving";

const PRIMARY_BTN =
  "bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300";
const SECONDARY_BTN =
  "text-sm text-neutral-500 border border-neutral-200 px-4 py-2 rounded-lg hover:border-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-300";

export default function ExpandDeckModal({ deck, onClose, onUpdated }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [request, setRequest] = useState("");
  const [newCards, setNewCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);

  const busy = step === "generating" || step === "saving";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function handleGenerate() {
    if (!request.trim()) return;
    setError(null);
    setStep("generating");
    try {
      const res = await fetch("/api/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId: deck.id, request }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStep("form");
        return;
      }
      const cards = parseNewCardsFromMessage(data.content ?? "");
      if (!cards) {
        setError("Couldn't read the generated cards. Please try again.");
        setStep("form");
        return;
      }
      setNewCards(cards);
      setStep("preview");
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setStep("form");
    }
  }

  async function handleConfirm() {
    setError(null);
    setStep("saving");
    try {
      const updated: Deck = { ...deck, cards: [...deck.cards, ...newCards] };
      await updateDeck(updated);
      // Keep an in-progress session valid: the practice page only restores the saved
      // order when cardOrder covers every card, so append the new ids (they come last).
      const session = await getSession(deck.id);
      if (session) {
        await saveSession(deck.id, {
          ...session,
          cardOrder: [...session.cardOrder, ...newCards.map((c) => c.id)],
        });
      }
      onUpdated(updated);
      onClose();
    } catch {
      setError("Couldn't save the new cards. Please try again.");
      setStep("preview");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-3 sm:px-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expand-deck-title"
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 gap-4 shadow-xl dark:bg-neutral-900 dark:border-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="expand-deck-title" className="text-lg font-semibold">
            Expand deck
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5 truncate">{deck.title}</p>
        </div>

        {step === "preview" || step === "saving" ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {newCards.length} new {newCards.length === 1 ? "card" : "cards"}:
            </p>
            <ul
              className="flex-1 overflow-y-auto space-y-2 min-h-0"
              data-testid="expand-preview"
            >
              {newCards.map((c) => (
                <li
                  key={c.id}
                  className="border border-neutral-200 rounded-lg p-3 text-sm break-words dark:border-neutral-700"
                >
                  <p className="font-medium">{c.question}</p>
                  <p className="text-neutral-500 mt-1 dark:text-neutral-400">{c.answer}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            maxLength={2000}
            rows={4}
            autoFocus
            disabled={busy}
            aria-label="What cards should be added?"
            placeholder={'e.g. "Add more cards covering X, Y and Z" — or be specific: "Add a card asking …"'}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-sm focus:outline-none focus:border-neutral-400 disabled:opacity-60 dark:bg-neutral-800 dark:border-neutral-700 dark:focus:border-neutral-500"
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {step === "preview" || step === "saving" ? (
            <>
              <button onClick={() => setStep("form")} disabled={busy} className={SECONDARY_BTN}>
                Back
              </button>
              <button onClick={handleConfirm} disabled={busy} className={PRIMARY_BTN}>
                {step === "saving"
                  ? "Adding…"
                  : `Add ${newCards.length} ${newCards.length === 1 ? "card" : "cards"}`}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} disabled={busy} className={SECONDARY_BTN}>
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={busy || !request.trim()}
                className={PRIMARY_BTN}
              >
                {step === "generating" ? "Generating cards…" : "Generate"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

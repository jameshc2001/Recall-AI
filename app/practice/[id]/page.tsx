"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Deck } from "@/lib/types";
import { getDeckById, updateDeck, getSession, saveSession, clearSession } from "@/lib/storage";
import FlashCard from "@/components/FlashCard";
import CardNote from "@/components/CardNote";
import ProgressBar from "@/components/ProgressBar";
import ScoreSummary from "@/components/ScoreSummary";

type Phase = "practicing" | "summary";

const DEFAULT_WIDTH = 768;
const MIN_WIDTH = 400;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<Array<"correct" | "incorrect">>([]);
  const [phase, setPhase] = useState<Phase>("practicing");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const id = typeof params.id === "string" ? params.id : params.id?.[0];
    if (!id) { router.replace("/"); return; }
    const found = getDeckById(id);
    if (!found) { router.replace("/"); return; }
    setDeck(found);

    const session = getSession(id);
    if (session && session.currentIndex < found.cards.length) {
      // Restore shuffled order from saved session
      const ordered = session.cardOrder
        .map((cardId) => found.cards.find((c) => c.id === cardId))
        .filter((c): c is Card => c !== undefined);
      const cards = ordered.length === found.cards.length ? ordered : shuffle(found.cards);
      setShuffledCards(cards);
      setCurrentIndex(session.currentIndex);
      setResults(session.results);
    } else {
      // New session — shuffle and persist the order immediately
      const cards = shuffle(found.cards);
      setShuffledCards(cards);
      saveSession(id, { currentIndex: 0, results: [], cardOrder: cards.map((c) => c.id) });
    }
  }, [params.id, router]);

  function handleMark(result: "correct" | "incorrect") {
    if (!deck) return;
    const updated = [...results, result];
    setResults(updated);
    if (currentIndex + 1 < shuffledCards.length) {
      setIsFlipped(false);
      saveSession(deck.id, { currentIndex: currentIndex + 1, results: updated, cardOrder: shuffledCards.map((c) => c.id) });
      // Swap content at the halfway point (125ms) when the card is edge-on
      // and neither face is visible, so the change is imperceptible.
      setTimeout(() => setCurrentIndex((i) => i + 1), 125);
    } else {
      clearSession(deck.id);
      setPhase("summary");
    }
  }

  function handleRestart() {
    if (!deck) return;
    const cards = shuffle(deck.cards);
    setShuffledCards(cards);
    saveSession(deck.id, { currentIndex: 0, results: [], cardOrder: cards.map((c) => c.id) });
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults([]);
    setPhase("practicing");
  }

  function startResize(e: React.PointerEvent, side: "left" | "right") {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startWidth = panelWidth;

    function onMove(ev: PointerEvent) {
      const delta = ev.clientX - startX;
      // Container is centered, so dragging one side by N px expands both sides → width grows 2×N
      const expansion = side === "right" ? delta : -delta;
      const maxWidth = window.innerWidth - 32;
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, startWidth + expansion * 2)));
    }
    function onUp() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  function handleSaveNote(cardId: string, note: string) {
    if (!deck) return;
    const updatedCards = deck.cards.map((c) =>
      c.id === cardId ? { ...c, note: note.trim() || undefined } : c
    );
    const updatedDeck = { ...deck, cards: updatedCards };
    setDeck(updatedDeck);
    updateDeck(updatedDeck);
    setShuffledCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, note: note.trim() || undefined } : c))
    );
  }

  if (!deck || shuffledCards.length === 0) return null;

  const card = shuffledCards[currentIndex];

  return (
    <div
      className="relative"
      style={{ width: `min(${panelWidth}px, calc(100vw - 2rem))`, margin: "0 auto" }}
    >
      {/* Left resize handle */}
      <div
        className="absolute top-0 -left-3 h-screen w-6 cursor-ew-resize group flex items-center justify-center z-10 select-none"
        onPointerDown={(e) => startResize(e, "left")}
      >
        <div className="w-px h-12 rounded-full bg-neutral-300 dark:bg-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Right resize handle */}
      <div
        className="absolute top-0 -right-3 h-screen w-6 cursor-ew-resize group flex items-center justify-center z-10 select-none"
        onPointerDown={(e) => startResize(e, "right")}
      >
        <div className="w-px h-12 rounded-full bg-neutral-300 dark:bg-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

    <main className="px-4 py-10 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-neutral-400 hover:text-neutral-700 text-sm transition-colors dark:hover:text-neutral-300">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold truncate flex-1">{deck.title}</h1>
        {phase === "practicing" && results.length > 0 && (
          <button
            onClick={handleRestart}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0"
          >
            Start over
          </button>
        )}
      </div>

      <div className="border border-neutral-200 rounded-2xl flex flex-col dark:border-neutral-700">
        {phase === "summary" ? (
          <ScoreSummary results={results} deckTitle={deck.title} onRestart={handleRestart} />
        ) : (
          <div className="flex flex-col p-6 gap-4">
            <ProgressBar current={currentIndex + 1} total={shuffledCards.length} />

            {/* Card + buttons — never scrolls, stays pinned */}
            <div className="shrink-0 flex flex-col items-center gap-4 pt-2">
              <FlashCard
                question={card.question}
                answer={card.answer}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(true)}
              />

              {isFlipped && (
                <div className="flex gap-3 w-full max-w-lg mx-auto">
                  <button
                    onClick={() => handleMark("incorrect")}
                    className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    Incorrect
                  </button>
                  <button
                    onClick={() => handleMark("correct")}
                    className="flex-1 py-3 rounded-xl border-2 border-green-200 text-green-600 font-medium text-sm hover:bg-green-50 transition-colors dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30"
                  >
                    Correct
                  </button>
                </div>
              )}
            </div>

            {/* Note — flows below card, page scrolls */}
            {isFlipped && (
              <div className="pb-4" data-testid="note-wrapper">
                <CardNote
                  key={card.id}
                  cardId={card.id}
                  question={card.question}
                  answer={card.answer}
                  initialNote={card.note}
                  onSave={(note) => handleSaveNote(card.id, note)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDeckById } from "@/lib/storage";
import FlashCard from "@/components/FlashCard";
import ProgressBar from "@/components/ProgressBar";
import ScoreSummary from "@/components/ScoreSummary";

type Phase = "practicing" | "summary";

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<Array<"correct" | "incorrect">>([]);
  const [phase, setPhase] = useState<Phase>("practicing");

  useEffect(() => {
    const id = typeof params.id === "string" ? params.id : params.id?.[0];
    if (!id) { router.replace("/"); return; }
    const found = getDeckById(id);
    if (!found) { router.replace("/"); return; }
    setDeck(found);
  }, [params.id, router]);

  function handleMark(result: "correct" | "incorrect") {
    if (!deck) return;
    const updated = [...results, result];
    setResults(updated);
    if (currentIndex + 1 < deck.cards.length) {
      setIsFlipped(false);
      // Swap content at the halfway point (250ms) when the card is edge-on
      // and neither face is visible, so the change is imperceptible.
      setTimeout(() => setCurrentIndex((i) => i + 1), 125);
    } else {
      setPhase("summary");
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults([]);
    setPhase("practicing");
  }

  if (!deck) return null;

  const card = deck.cards[currentIndex];

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-neutral-400 hover:text-neutral-700 text-sm transition-colors">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold truncate">{deck.title}</h1>
      </div>

      <div className="flex-1 border border-neutral-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
        {phase === "summary" ? (
          <ScoreSummary results={results} deckTitle={deck.title} onRestart={handleRestart} />
        ) : (
          <div className="flex flex-col h-full p-6 gap-6">
            <ProgressBar current={currentIndex + 1} total={deck.cards.length} />

            <div className="flex-1 flex flex-col items-center justify-center gap-6">
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
                    className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors"
                  >
                    Incorrect
                  </button>
                  <button
                    onClick={() => handleMark("correct")}
                    className="flex-1 py-3 rounded-xl border-2 border-green-200 text-green-600 font-medium text-sm hover:bg-green-50 transition-colors"
                  >
                    Correct
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

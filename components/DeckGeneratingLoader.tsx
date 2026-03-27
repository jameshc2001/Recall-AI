"use client";

import { useEffect, useState } from "react";

const LINES = [
  "Consulting the ancient scrolls...",
  "Training a tiny neural network just for you...",
  "Mining for knowledge in the deepest Wikipedia caves...",
  "Arguing with itself about the best questions...",
  "Carefully selecting the most confusing phrasing...",
  "Converting caffeine into flashcards...",
  "Debating whether this question is too easy...",
  "Pretending it knew this all along...",
  "Alphabetising facts it just made up...",
  "Polishing each card to a mirror shine...",
  "Checking if any of this was on the syllabus...",
  "Questioning every life choice that led to this moment...",
];

export default function DeckGeneratingLoader() {
  const [lineIndex, setLineIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setLineIndex((i) => (i + 1) % LINES.length);
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8 select-none">
      {/* Stacked pulsing cards */}
      <div className="relative h-16 w-24">
        <div className="absolute inset-0 bg-neutral-300 dark:bg-neutral-600 rounded-xl rotate-[-6deg] animate-pulse" />
        <div className="absolute inset-0 bg-neutral-500 dark:bg-neutral-400 rounded-xl rotate-[2deg] animate-pulse [animation-delay:300ms]" />
        <div className="absolute inset-0 bg-neutral-900 dark:bg-neutral-100 rounded-xl animate-pulse [animation-delay:600ms]" />
      </div>

      <div className="text-center space-y-3">
        <p className="font-semibold text-neutral-800 dark:text-neutral-100">
          Generating your deck...
        </p>
        <p
          className="text-sm text-neutral-500 dark:text-neutral-400 transition-opacity duration-300 min-h-[1.25rem]"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {LINES[lineIndex]}
        </p>
      </div>

      <div className="flex gap-1.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

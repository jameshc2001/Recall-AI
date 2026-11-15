"use client";

import Link from "next/link";
import { Deck } from "@/lib/types";
import DeckCard from "./DeckCard";

interface Props {
  decks: Deck[];
  onDelete: (id: string) => void;
}

export default function DeckList({ decks, onDelete }: Props) {
  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral-400 text-lg mb-4">No decks yet.</p>
        <Link
          href="/create"
          className="bg-neutral-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Create your first deck
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} onDelete={onDelete} />
      ))}
    </div>
  );
}

/** Placeholder grid shown while decks are being fetched. Mirrors DeckCard's layout. */
export function DeckListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading decks"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4 animate-pulse dark:bg-neutral-800 dark:border-neutral-700"
        >
          <div className="flex-1 space-y-2">
            <div className="h-5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
            <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-neutral-700/60" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 rounded bg-neutral-100 dark:bg-neutral-700/60" />
            <div className="h-4 w-20 rounded bg-neutral-100 dark:bg-neutral-700/60" />
          </div>
          <div className="h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700/60" />
        </div>
      ))}
    </div>
  );
}

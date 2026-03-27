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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, deleteDeck } from "@/lib/storage";
import DeckList from "@/components/DeckList";

export default function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  function handleDelete(id: string) {
    deleteDeck(id);
    setDecks(getDecks());
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Recall AI</h1>
        <Link
          href="/create"
          className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          + New deck
        </Link>
      </div>
      <DeckList decks={decks} onDelete={handleDelete} />
    </main>
  );
}

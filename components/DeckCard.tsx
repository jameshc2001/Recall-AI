"use client";

import Link from "next/link";
import { useState } from "react";
import { Deck } from "@/lib/types";

interface Props {
  deck: Deck;
  onDelete: (id: string) => void;
}

export default function DeckCard({ deck, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const date = new Date(deck.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex-1">
        <h2 className="font-semibold text-lg leading-snug">{deck.title}</h2>
        <p className="text-sm text-neutral-500 mt-1">{deck.topic}</p>
      </div>
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <span>{deck.cards.length} cards</span>
        <span>{date}</span>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/practice/${deck.id}`}
          className="flex-1 text-center bg-neutral-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          Practice
        </Link>
        {confirmDelete ? (
          <button
            onClick={() => onDelete(deck.id)}
            className="flex-1 text-center bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Confirm delete
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 text-sm text-neutral-500 border border-neutral-200 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

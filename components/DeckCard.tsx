"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Deck } from "@/lib/types";
import { getSession } from "@/lib/clientStorage";
import { PracticeSession } from "@/lib/storage";
import { buildExportPayload, downloadDeckFile } from "@/lib/deckIO";

interface Props {
  deck: Deck;
  onDelete: (id: string) => void;
}

export default function DeckCard({ deck, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleExport() {
    downloadDeckFile(buildExportPayload(deck, session));
  }
  const [session, setSession] = useState<PracticeSession | null>(null);

  useEffect(() => {
    getSession(deck.id).then(setSession);
  }, [deck.id]);

  const date = new Date(deck.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow dark:bg-neutral-800 dark:border-neutral-700">
      <div className="flex-1">
        <h2 className="font-semibold text-lg leading-snug">{deck.title}</h2>
        <p className="text-sm text-neutral-500 mt-1">{deck.topic}</p>
      </div>
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <span>{deck.cards.length} cards</span>
        <span>{date}</span>
      </div>
      {session && session.results.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
            <span>In progress</span>
            <span>{session.results.length} / {deck.cards.length} cards</span>
          </div>
          <div className="h-1 bg-neutral-100 rounded-full overflow-hidden dark:bg-neutral-700">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${(session.results.length / deck.cards.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Link
          href={`/practice/${deck.id}`}
          className="flex-1 text-center bg-neutral-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-neutral-700 transition-colors dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Practice
        </Link>
        <button
          onClick={handleExport}
          className="px-4 text-sm text-neutral-500 border border-neutral-200 rounded-lg hover:border-neutral-400 hover:text-neutral-700 transition-colors dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-300"
        >
          Export
        </button>
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
            className="px-4 text-sm text-neutral-500 border border-neutral-200 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-red-700 dark:hover:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Deck } from "@/lib/types";
import { getDecks, deleteDeck, saveDeck, saveSession } from "@/lib/storage";
import { parseDeckExportFile, importDeckFromPayload } from "@/lib/deckIO";
import DeckList from "@/components/DeckList";

export default function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  function handleDelete(id: string) {
    deleteDeck(id);
    setDecks(getDecks());
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (importInputRef.current) importInputRef.current.value = "";
    if (!file) return;
    setImportError(null);
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setImportError("Could not read file — is it a valid JSON file?");
      return;
    }
    const result = parseDeckExportFile(raw);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    importDeckFromPayload(result.data, { saveDeck, saveSession });
    setDecks(getDecks());
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Recall AI</h1>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="text-sm text-neutral-600 border border-neutral-200 px-4 py-2 rounded-lg hover:border-neutral-400 hover:text-neutral-800 transition-colors dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-300"
          >
            Import
          </button>
          <Link
            href="/create"
            className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            + New deck
          </Link>
        </div>
      </div>
      {importError && (
        <p role="alert" className="text-sm text-red-500 -mt-4 mb-6">
          {importError}
        </p>
      )}
      <DeckList decks={decks} onDelete={handleDelete} />
    </main>
  );
}

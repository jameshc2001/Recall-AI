"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deck } from "@/lib/types";
import { getDecks, deleteDeck, saveDeck, saveSession } from "@/lib/clientStorage";
import { parseDeckExportFile } from "@/lib/deckIO";
import DeckList, { DeckListSkeleton } from "@/components/DeckList";

export default function HomePage() {
  const router = useRouter();
  // null until the first fetch finishes, so we can show a skeleton instead of the empty state
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  useEffect(() => {
    getDecks()
      .then(setDecks)
      .catch(() => setLoadError(true));
  }, []);

  async function handleDelete(id: string) {
    await deleteDeck(id);
    setDecks(await getDecks());
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
    const { deck, session } = result.data;
    const newId = crypto.randomUUID();
    const newDeck = { ...deck, id: newId };
    await saveDeck(newDeck);
    if (session) await saveSession(newId, session);
    setDecks(await getDecks());
  }

  return (
    <main className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-10">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 justify-between mb-4 pr-11 sm:mb-8 sm:pr-0">
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
            onClick={handleLogout}
            className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors px-2 py-2"
          >
            Log out
          </button>
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
      {loadError ? (
        <p role="alert" className="text-sm text-red-500 py-24 text-center">
          Couldn&apos;t load your decks. Try refreshing the page.
        </p>
      ) : decks === null ? (
        <DeckListSkeleton />
      ) : (
        <DeckList decks={decks} onDelete={handleDelete} />
      )}
    </main>
  );
}

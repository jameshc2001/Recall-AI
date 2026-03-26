"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Message, Deck } from "@/lib/types";
import { parseDeckFromMessage } from "@/lib/deckParser";
import { saveDeck } from "@/lib/storage";
import ChatWindow from "@/components/ChatWindow";

export default function CreatePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [readyDeck, setReadyDeck] = useState<Deck | null>(null);

  // Kick off the conversation with an empty user-side trigger on mount
  useEffect(() => {
    sendToApi([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToApi(history: Message[]) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send a minimal user message to start if history is empty
        body: JSON.stringify({ messages: history.length > 0 ? history : [{ role: "user", content: "Hi" }] }),
      });
      const data: { role: "assistant"; content: string } = await res.json();
      const updatedMessages: Message[] = [...history, data];
      setMessages(updatedMessages);

      const deck = parseDeckFromMessage(data.content);
      if (deck) setReadyDeck(deck);
    } catch {
      // show error message in chat
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSend(text: string) {
    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updated);
    sendToApi(updated);
  }

  function handleSaveDeck() {
    if (!readyDeck) return;
    saveDeck(readyDeck);
    router.push("/");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-neutral-400 hover:text-neutral-700 text-sm transition-colors">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Create a deck</h1>
      </div>

      <div className="flex-1 border border-neutral-200 rounded-2xl overflow-hidden flex flex-col bg-neutral-50 min-h-0">
        {readyDeck ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">{readyDeck.title}</h2>
              <p className="text-neutral-500 text-sm">{readyDeck.cards.length} cards ready</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDeck}
                className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Save deck
              </button>
              <Link
                href="/"
                className="text-sm text-neutral-500 border border-neutral-200 px-6 py-2.5 rounded-lg hover:border-neutral-400 transition-colors"
              >
                Discard
              </Link>
            </div>
          </div>
        ) : (
          <ChatWindow messages={messages} onSend={handleSend} isLoading={isLoading} />
        )}
      </div>
    </main>
  );
}

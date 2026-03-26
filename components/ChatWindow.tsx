"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "@/lib/types";
import ChatMessage from "./ChatMessage";

interface Props {
  messages: Message[];
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function ChatWindow({ messages, onSend, isLoading }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend(text);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-neutral-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-neutral-200 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 text-sm bg-neutral-100 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-neutral-300 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

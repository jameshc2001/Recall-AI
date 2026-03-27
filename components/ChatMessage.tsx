import { Message } from "@/lib/types";

interface Props {
  message: Message;
}

export default function ChatMessage({ message }: Props) {
  // Strip JSON code block from display — user just sees the prose intro
  const displayContent = message.content.replace(/```(?:json)?\s*[\s\S]*?```/g, "").trim();

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-neutral-900 text-white rounded-br-sm"
            : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
        }`}
      >
        {displayContent}
      </div>
    </div>
  );
}

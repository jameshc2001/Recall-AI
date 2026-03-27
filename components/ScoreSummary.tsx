import Link from "next/link";

interface Props {
  results: Array<"correct" | "incorrect">;
  deckTitle: string;
  onRestart: () => void;
}

export default function ScoreSummary({ results, deckTitle, onRestart }: Props) {
  const correct = results.filter((r) => r === "correct").length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
      <div>
        <p className="text-sm text-neutral-400 mb-1">Session complete</p>
        <h2 className="text-2xl font-semibold">{deckTitle}</h2>
      </div>

      <div className="flex gap-8">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-green-500">{correct}</span>
          <span className="text-xs text-neutral-400 mt-1">Correct</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-red-400">{total - correct}</span>
          <span className="text-xs text-neutral-400 mt-1">Incorrect</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-neutral-700 dark:text-neutral-300">{pct}%</span>
          <span className="text-xs text-neutral-400 mt-1">Score</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="bg-neutral-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-neutral-700 transition-colors dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Practice again
        </button>
        <Link
          href="/"
          className="text-sm text-neutral-500 border border-neutral-200 px-6 py-2.5 rounded-lg hover:border-neutral-400 transition-colors dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500"
        >
          Back to decks
        </Link>
      </div>
    </div>
  );
}

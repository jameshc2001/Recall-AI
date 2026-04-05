interface Props {
  question: string;
  answer: string;
  isFlipped: boolean;
  onFlip: () => void;
}

export default function FlashCard({ question, answer, isFlipped, onFlip }: Props) {
  return (
    <div
      className="w-full max-w-lg mx-auto cursor-pointer [perspective:1000px] h-[220px] sm:h-[260px]"
      onClick={!isFlipped ? onFlip : undefined}
    >
      <div
        className={`relative w-full h-full transition-transform duration-[250ms] ease-linear [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front — question */}
        <div className="absolute inset-0 [backface-visibility:hidden] bg-white border border-neutral-200 rounded-2xl flex flex-col items-center justify-center p-4 sm:p-8 shadow-sm dark:bg-neutral-800 dark:border-neutral-700">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Question</span>
          <p className="text-base sm:text-lg text-center text-neutral-800 font-medium leading-relaxed dark:text-neutral-100">{question}</p>
          <span className="mt-6 text-xs text-neutral-300 dark:text-neutral-600">Click to reveal answer</span>
        </div>

        {/* Back — answer */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-neutral-900 dark:bg-neutral-700 rounded-2xl flex flex-col items-center justify-center p-4 sm:p-8 shadow-sm dark:shadow-neutral-900">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Answer</span>
          <p className="text-base sm:text-lg text-center text-white font-medium leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  question: string;
  answer: string;
  isFlipped: boolean;
  onFlip: () => void;
}

export default function FlashCard({ question, answer, isFlipped, onFlip }: Props) {
  return (
    <div
      className="w-full max-w-lg mx-auto cursor-pointer [perspective:1000px] h-[280px] sm:h-[260px]"
      onClick={onFlip}
      data-testid="flashcard"
      data-flipped={isFlipped}
    >
      <div
        className={`relative w-full h-full transition-transform duration-[250ms] ease-linear [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front — question */}
        <div className="absolute inset-0 [backface-visibility:hidden] bg-white border border-neutral-200 rounded-2xl flex flex-col overflow-hidden p-3 sm:p-8 shadow-sm dark:bg-neutral-800 dark:border-neutral-700">
          {/* Scroll lives on an inner div (not the 3D face); my-auto centres short
              content but lets overflowing content start at the top and scroll. */}
          <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col" data-testid="flashcard-question-scroll">
            <div className="my-auto text-center">
              <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 sm:mb-4">Question</span>
              <p className="text-base sm:text-lg text-neutral-800 font-medium leading-relaxed break-words dark:text-neutral-100">{question}</p>
            </div>
          </div>
        </div>

        {/* Back — answer */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-neutral-900 dark:bg-neutral-700 rounded-2xl flex flex-col overflow-hidden p-3 sm:p-8 shadow-sm dark:shadow-neutral-900">
          <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col" data-testid="flashcard-answer-scroll">
            <div className="my-auto text-center">
              <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 sm:mb-4">Answer</span>
              <p className="text-base sm:text-lg text-white font-medium leading-relaxed break-words" data-testid="flashcard-answer">{answer}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  question: string;
  answer: string;
  isFlipped: boolean;
  onFlip: () => void;
}

export default function FlashCard({ question, answer, isFlipped, onFlip }: Props) {
  return (
    <div
      className="w-full max-w-lg mx-auto cursor-pointer [perspective:1000px]"
      style={{ height: 260 }}
      onClick={!isFlipped ? onFlip : undefined}
    >
      <div
        className={`relative w-full h-full transition-transform duration-[250ms] ease-linear [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front — question */}
        <div className="absolute inset-0 [backface-visibility:hidden] bg-white border border-neutral-200 rounded-2xl flex flex-col items-center justify-center p-8 shadow-sm">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Question</span>
          <p className="text-lg text-center text-neutral-800 font-medium leading-relaxed">{question}</p>
          <span className="mt-6 text-xs text-neutral-300">Click to reveal answer</span>
        </div>

        {/* Back — answer */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-neutral-900 rounded-2xl flex flex-col items-center justify-center p-8 shadow-sm">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Answer</span>
          <p className="text-lg text-center text-white font-medium leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

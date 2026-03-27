interface Props {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
        <span>Card {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden dark:bg-neutral-700">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all duration-300 dark:bg-neutral-100"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

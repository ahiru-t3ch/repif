"use client";

type FinanceYesNoChoiceProps = {
  value: boolean;
  yesLabel: string;
  noLabel: string;
  onChange: (next: boolean) => void;
};

export function FinanceYesNoChoice({
  value,
  yesLabel,
  noLabel,
  onChange,
}: FinanceYesNoChoiceProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((option) => {
        const selected = value === option;
        return (
          <button
            key={option ? "yes" : "no"}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={`rounded-xl border px-4 py-4 text-sm font-medium transition ${
              selected
                ? "border-accent bg-stone-900 text-white shadow-sm"
                : "border-border bg-surface text-foreground hover:border-stone-400 hover:bg-stone-50"
            }`}
          >
            {option ? yesLabel : noLabel}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import {
  choiceSelectedClassName,
  choiceUnselectedClassName,
} from "@/lib/ui-classes";

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
              selected ? choiceSelectedClassName : choiceUnselectedClassName
            }`}
          >
            {option ? yesLabel : noLabel}
          </button>
        );
      })}
    </div>
  );
}

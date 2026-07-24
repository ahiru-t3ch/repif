"use client";

import type { ReactNode } from "react";

type EstimateWizardProps = {
  step: number;
  stepLabels: string[];
  stepHint?: string;
  stepIndicator: string;
  children: ReactNode;
  showBack: boolean;
  backLabel: string;
  onBack: () => void;
  showNext: boolean;
  nextLabel: string;
  onNext: () => void;
  showSubmit: boolean;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  onSubmitClick?: () => void;
};

export function EstimateWizard({
  step,
  stepLabels,
  stepHint,
  stepIndicator,
  children,
  showBack,
  backLabel,
  onBack,
  showNext,
  nextLabel,
  onNext,
  showSubmit,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmitClick,
}: EstimateWizardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {stepIndicator}
        </p>
        <ol
          className={`grid gap-2 sm:gap-3 ${
            stepLabels.length >= 7
              ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
              : stepLabels.length >= 5
                ? "grid-cols-2 sm:grid-cols-5"
                : stepLabels.length >= 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-3"
          }`}
        >
          {stepLabels.map((label, index) => {
            const isActive = index === step;
            const isComplete = index < step;
            return (
              <li key={label} className="min-w-0">
                <div
                  className={`mb-2 h-1 rounded-full transition ${
                    isComplete || isActive ? "bg-accent" : "bg-border"
                  }`}
                  aria-hidden
                />
                <p
                  className={`truncate text-xs font-medium sm:text-sm ${
                    isActive ? "text-foreground" : "text-muted"
                  }`}
                >
                  {label}
                </p>
              </li>
            );
          })}
        </ol>
        {stepHint && (
          <p className="text-sm text-muted">{stepHint}</p>
        )}
      </div>

      <div className="flex flex-col gap-5">{children}</div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-stone-400 hover:bg-stone-50"
          >
            {backLabel}
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}
        {showNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 sm:ml-auto"
          >
            {nextLabel}
          </button>
        )}
        {showSubmit && (
          <button
            type={onSubmitClick ? "button" : "submit"}
            disabled={submitting}
            onClick={onSubmitClick}
            className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}

type PropertyTypeChoiceProps = {
  value: "APARTMENT" | "HOUSE";
  apartmentLabel: string;
  houseLabel: string;
  onChange: (value: "APARTMENT" | "HOUSE") => void;
};

export function PropertyTypeChoice({
  value,
  apartmentLabel,
  houseLabel,
  onChange,
}: PropertyTypeChoiceProps) {
  const options = [
    { id: "APARTMENT" as const, label: apartmentLabel },
    { id: "HOUSE" as const, label: houseLabel },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={`rounded-xl border px-4 py-4 text-sm font-medium transition ${
              selected
                ? "border-accent bg-stone-900 text-white shadow-sm"
                : "border-border bg-surface text-foreground hover:border-stone-400 hover:bg-stone-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

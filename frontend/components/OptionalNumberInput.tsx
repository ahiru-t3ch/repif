"use client";

import { useEffect, useRef, useState } from "react";

type OptionalNumberInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  /** Value applied on blur when the field is left empty. */
  emptyValue?: number;
  /** When value equals emptyValue, show a blank field (e.g. apport default 0). */
  blankWhenEmptyValue?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  /** Prefer integer keypad when step is a whole number. */
  integer?: boolean;
};

function clamp(n: number, min?: number, max?: number): number {
  let next = n;
  if (min !== undefined) {
    next = Math.max(min, next);
  }
  if (max !== undefined) {
    next = Math.min(max, next);
  }
  return next;
}

/** Stable display for a committed number (no leading zeros). */
export function formatCommittedNumber(n: number): string {
  if (!Number.isFinite(n)) {
    return "";
  }
  const rounded = Math.round(n * 1e6) / 1e6;
  return String(rounded);
}

function isAllowedDraft(raw: string): boolean {
  return raw === "" || /^-?\d*[.,]?\d*$/.test(raw);
}

/** Drop leading zeros ("05" → "5") while keeping "0", "0.", "0.5". */
function tidyDraft(raw: string): string {
  const s = raw.replace(",", ".");
  if (s === "" || s === "-" || s.endsWith(".")) {
    return s;
  }
  if (!/^-?\d*\.?\d*$/.test(s)) {
    return s;
  }
  const negative = s.startsWith("-");
  const body = negative ? s.slice(1) : s;
  const [intPart, decPart] = body.split(".");
  const tidyInt = intPart.replace(/^0+(?=\d)/, "");
  const next = decPart !== undefined ? `${tidyInt}.${decPart}` : tidyInt;
  return negative ? `-${next}` : next;
}

/**
 * Controlled numeric field that can be cleared without snapping to 0,
 * and that never displays leading zeros like "05".
 */
export function OptionalNumberInput({
  value,
  onValueChange,
  min,
  max,
  step,
  emptyValue = 0,
  blankWhenEmptyValue = false,
  placeholder,
  className,
  id,
  disabled,
  "aria-label": ariaLabel,
  integer = false,
}: OptionalNumberInputProps) {
  const focusedRef = useRef(false);
  const [text, setText] = useState(() =>
    blankWhenEmptyValue && value === emptyValue
      ? ""
      : formatCommittedNumber(value),
  );

  useEffect(() => {
    if (focusedRef.current) {
      return;
    }
    if (blankWhenEmptyValue && value === emptyValue) {
      setText("");
    } else {
      setText(formatCommittedNumber(value));
    }
  }, [value, blankWhenEmptyValue, emptyValue]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (
      trimmed === "" ||
      trimmed === "-" ||
      trimmed === "." ||
      trimmed === "-."
    ) {
      onValueChange(emptyValue);
      setText(blankWhenEmptyValue ? "" : formatCommittedNumber(emptyValue));
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      onValueChange(emptyValue);
      setText(blankWhenEmptyValue ? "" : formatCommittedNumber(emptyValue));
      return;
    }
    const next = clamp(parsed, min, max);
    onValueChange(next);
    setText(formatCommittedNumber(next));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      value={text}
      onFocus={(e) => {
        focusedRef.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!isAllowedDraft(raw)) {
          return;
        }
        const nextText = tidyDraft(raw);
        setText(nextText);
        if (
          nextText === "" ||
          nextText === "-" ||
          nextText === "." ||
          nextText === "-."
        ) {
          return;
        }
        const parsed = Number(nextText);
        if (Number.isFinite(parsed)) {
          onValueChange(clamp(parsed, min, max));
        }
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit(text);
      }}
    />
  );
}

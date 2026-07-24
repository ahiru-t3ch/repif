"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type AddressSuggestion = {
  label: string;
  score: number;
  city: string;
  postcode: string;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
  listLabel: string;
  loadingLabel?: string;
};

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  minLength = 10,
  maxLength = 255,
  className,
  listLabel,
  loadingLabel,
}: AddressAutocompleteProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useEffectEvent(async (query: string, signal: AbortSignal) => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query.trim(), limit: "5" });
      const response = await fetch(`/api/geocode/suggest?${params}`, { signal });
      if (!response.ok) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const data = (await response.json()) as { suggestions?: AddressSuggestion[] };
      const next = data.suggestions ?? [];
      setSuggestions(next);
      setOpen(next.length > 0);
      setActiveIndex(-1);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setSuggestions([]);
      setOpen(false);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchSuggestions(value, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSuggestion(suggestion: AddressSuggestion) {
    skipNextFetchRef.current = true;
    onChange(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "Escape") {
        setOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showList = open && suggestions.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        className={className}
      />

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={listLabel}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;
            return (
              <li
                key={suggestion.label}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={active}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`flex w-full flex-col px-3.5 py-2 text-left text-sm transition ${
                    active
                      ? "bg-surface-muted text-foreground"
                      : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  <span>{suggestion.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <span className="sr-only" aria-live="polite">
        {loading ? (loadingLabel ?? "…") : ""}
      </span>
    </div>
  );
}

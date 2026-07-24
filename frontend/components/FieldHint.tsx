"use client";

type FieldHintProps = {
  text: string;
};

export function FieldHint({ text }: FieldHintProps) {
  return (
    <button
      type="button"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong font-serif text-[10px] font-bold leading-none text-muted transition hover:border-primary hover:text-foreground"
      title={text}
      aria-label={text}
    >
      i
    </button>
  );
}

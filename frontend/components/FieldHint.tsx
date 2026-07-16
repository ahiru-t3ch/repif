"use client";

type FieldHintProps = {
  text: string;
};

export function FieldHint({ text }: FieldHintProps) {
  return (
    <button
      type="button"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-400 font-serif text-[10px] font-bold leading-none text-muted transition hover:border-stone-600 hover:text-foreground"
      title={text}
      aria-label={text}
    >
      i
    </button>
  );
}

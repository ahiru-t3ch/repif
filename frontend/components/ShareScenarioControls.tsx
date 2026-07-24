"use client";

type ShareScenarioControlsProps = {
  variant: "dark" | "light";
  status: "idle" | "loading" | "copied" | "error";
  message: string | null;
  onShare: () => void;
  buttonLabel: string;
  creatingLabel: string;
  copiedLabel: string;
};

export function ShareScenarioControls({
  variant,
  status,
  message,
  onShare,
  buttonLabel,
  creatingLabel,
  copiedLabel,
}: ShareScenarioControlsProps) {
  const isDark = variant === "dark";
  return (
    <div
      className={`flex flex-col ${isDark ? "items-end" : "items-stretch sm:items-start"} gap-1`}
    >
      <button
        type="button"
        onClick={onShare}
        disabled={status === "loading"}
        className={
          isDark
            ? "rounded-md border border-stone-500 px-3 py-1.5 text-sm font-medium text-white transition hover:border-stone-300 hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"
            : "rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"
        }
      >
        {status === "loading"
          ? creatingLabel
          : status === "copied"
            ? copiedLabel
            : buttonLabel}
      </button>
      {message && (
        <p
          className={`text-xs ${
            status === "error"
              ? isDark
                ? "text-amber-300"
                : "text-red-700"
              : isDark
                ? "text-stone-400"
                : "text-muted"
          } ${isDark ? "" : "break-all"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

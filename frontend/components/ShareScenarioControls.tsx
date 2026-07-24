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
            ? "rounded-md border border-primary/40 bg-surface/80 px-3 py-1.5 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-wait disabled:opacity-60"
            : "rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
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
              ? "text-danger"
              : isDark
                ? "text-card-subtle"
                : "text-muted"
          } ${isDark ? "" : "break-all"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/** Classes UI partagées — alignées sur les tokens de globals.css */

const cloudShadow =
  "shadow-[0_4px_24px_rgba(56,189,248,0.1)]";

const cloudHeroShadow =
  "shadow-[0_12px_40px_rgba(14,165,233,0.14)]";

export const sectionCardClassName = `rounded-2xl border border-border bg-surface/95 p-6 backdrop-blur-sm ${cloudShadow} sm:p-8`;

export const cardDarkSectionClassName = `rounded-2xl border border-card-border bg-gradient-to-b from-white to-surface-muted px-6 py-7 text-card-foreground backdrop-blur-sm ${cloudHeroShadow} sm:px-8`;

export const labelClassName =
  "text-xs font-medium uppercase tracking-wide text-muted";

export const inputClassName =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus/35";

export const darkInputClassName =
  "mt-2 w-full rounded-lg border border-card-input-border bg-card-input px-3 py-2 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus/35";

export const btnPrimaryClassName =
  "rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimarySmClassName =
  "rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary-hover";

export const btnSecondaryClassName =
  "rounded-lg border border-border bg-surface/90 px-4 py-3 text-sm font-medium text-foreground transition hover:border-border-strong hover:bg-surface-muted";

export const btnSecondarySmClassName =
  "rounded-lg border border-border bg-surface/90 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-border-strong hover:bg-surface-muted";

export const choiceSelectedClassName =
  "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/15";

export const choiceUnselectedClassName =
  "border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted";

export const alertErrorClassName =
  "rounded-lg border border-danger/25 bg-danger-muted px-4 py-3 text-sm text-danger-foreground";

export const linkUnderlineClassName =
  "underline decoration-border-strong underline-offset-2 hover:text-primary";

export const rangeLightClassName =
  "mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary";

export const rangeDarkClassName =
  "mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-card-track accent-primary";

export type SurfaceVariant = "dark" | "light";

export function cardBorderClassName(variant: SurfaceVariant) {
  return variant === "dark" ? "border-card-border" : "border-border";
}

export function cardMutedTextClassName(variant: SurfaceVariant) {
  return variant === "dark" ? "text-card-muted" : "text-muted";
}

export function cardSubtleTextClassName(variant: SurfaceVariant) {
  return variant === "dark" ? "text-card-subtle" : "text-muted";
}

export function cardFaintTextClassName(variant: SurfaceVariant) {
  return variant === "dark" ? "text-card-faint" : "text-muted";
}

export function cardLabelClassName(variant: SurfaceVariant) {
  return variant === "dark"
    ? "text-xs font-medium uppercase tracking-[0.15em] text-primary"
    : "text-xs font-medium uppercase tracking-[0.15em] text-muted";
}

export function cardEmphasisClassName(variant: SurfaceVariant) {
  return variant === "dark" ? "text-primary" : "text-foreground";
}

export function warningTextClassName(_variant: SurfaceVariant) {
  return "text-warning";
}

export function modeButtonActiveClassName(_variant: SurfaceVariant) {
  return "bg-primary text-primary-foreground shadow-sm shadow-primary/15";
}

export function modeButtonInactiveClassName(variant: SurfaceVariant) {
  return variant === "dark"
    ? "border border-card-border bg-surface text-card-muted hover:border-border-strong hover:bg-card-elevated hover:text-foreground"
    : "border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted";
}

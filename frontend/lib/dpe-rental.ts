export const RESTRICTED_DPE_VALUES = [5, 6, 7] as const;

export const DPE_RENTAL_ROWS = [
  { letter: "G", statusKey: "statusForbidden", dateKey: "dateG" },
  { letter: "F", statusKey: "statusSoonForbidden", dateKey: "dateF" },
  { letter: "E", statusKey: "statusDeferred", dateKey: "dateE" },
] as const;

export function dpeValueToLetter(value: number): string | null {
  if (value < 1 || value > 7) {
    return null;
  }
  return String.fromCharCode(64 + value);
}

export function isRestrictedDpe(value: string | number): boolean {
  const numeric = Number(value);
  return RESTRICTED_DPE_VALUES.includes(
    numeric as (typeof RESTRICTED_DPE_VALUES)[number],
  );
}

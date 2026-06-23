export const NOTARY_OLD = {
  min: 7,
  max: 8.5,
  default: 7.75,
  step: 0.1,
} as const;

export const NOTARY_NEW = {
  min: 2,
  max: 3,
  default: 2.5,
  step: 0.1,
} as const;

export type NotaryPropertyAge = "OLD" | "NEW";
export type NotaryFeeRange = typeof NOTARY_OLD | typeof NOTARY_NEW;

export function getNotaryFeeRangeByAge(age: NotaryPropertyAge): NotaryFeeRange {
  return age === "NEW" ? NOTARY_NEW : NOTARY_OLD;
}

export function inferNotaryPropertyAge(
  yearBuilt: number,
  currentYear = new Date().getFullYear(),
): NotaryPropertyAge {
  return yearBuilt >= currentYear - 1 ? "NEW" : "OLD";
}

export function notaryFeeAmount(netPrice: number, rate: number): number {
  return Math.round((netPrice * rate) / 100);
}

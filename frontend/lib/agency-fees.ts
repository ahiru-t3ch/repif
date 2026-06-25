export type AgencyFeeMode = "percent" | "fixed";

export const AGENCY_FEE_PERCENT = {
  min: 0,
  max: 10,
  step: 0.5,
  defaultRate: 4,
} as const;

export function agencyFeeAmountFromRate(netPrice: number, rate: number): number {
  return Math.round((netPrice * rate) / 100);
}

export function agencyFeeAmount(
  netPrice: number,
  mode: AgencyFeeMode,
  rate: number,
  fixedAmount: number,
): number {
  if (mode === "fixed") {
    return Math.max(0, Math.round(fixedAmount));
  }
  return agencyFeeAmountFromRate(netPrice, rate);
}

export function priceWithAgencyFees(
  netPrice: number,
  mode: AgencyFeeMode,
  rate: number,
  fixedAmount: number,
): number {
  return netPrice + agencyFeeAmount(netPrice, mode, rate, fixedAmount);
}

export function effectiveAgencyFeeRate(netPrice: number, feeAmount: number): number {
  if (netPrice <= 0) {
    return 0;
  }
  return (feeAmount / netPrice) * 100;
}

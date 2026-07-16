/** Defaults for the indicative mortgage simulator (frontend only). */
export const DEFAULT_LOAN_DOWN_PAYMENT = 0;
export const DEFAULT_LOAN_DURATION_YEARS = 25;
export const DEFAULT_LOAN_INTEREST_RATE = 3.5;
export const DEFAULT_LOAN_INSURANCE_RATE = 0.34;

export function loanPrincipal(loanBase: number, downPayment: number): number {
  return Math.max(0, loanBase - Math.max(0, downPayment));
}

/** Monthly principal+interest payment (French-style constant annuity). */
export function monthlyLoanPayment(
  principal: number,
  annualInterestRatePct: number,
  durationYears: number,
): number {
  const capital = Math.max(0, principal);
  const months = Math.max(0, Math.round(durationYears * 12));
  if (capital <= 0 || months <= 0) {
    return 0;
  }

  const monthlyRate = annualInterestRatePct / 100 / 12;
  if (monthlyRate === 0) {
    return capital / months;
  }

  const factor = Math.pow(1 + monthlyRate, months);
  return (capital * monthlyRate * factor) / (factor - 1);
}

/** Monthly insurance based on initial capital (% per year / 12). */
export function monthlyInsurance(
  principal: number,
  annualInsuranceRatePct: number,
): number {
  const capital = Math.max(0, principal);
  const rate = Math.max(0, annualInsuranceRatePct);
  return (capital * rate) / 100 / 12;
}

export function monthlyTotalPayment(
  principal: number,
  annualInterestRatePct: number,
  durationYears: number,
  annualInsuranceRatePct: number,
): number {
  return (
    monthlyLoanPayment(principal, annualInterestRatePct, durationYears) +
    monthlyInsurance(principal, annualInsuranceRatePct)
  );
}

/** Total interest + insurance over the full term (payments − principal). */
export function totalCreditCost(
  principal: number,
  annualInterestRatePct: number,
  durationYears: number,
  annualInsuranceRatePct: number,
): number {
  const capital = Math.max(0, principal);
  const months = Math.max(0, Math.round(durationYears * 12));
  if (capital <= 0 || months <= 0) {
    return 0;
  }

  const monthly = monthlyTotalPayment(
    capital,
    annualInterestRatePct,
    durationYears,
    annualInsuranceRatePct,
  );
  return monthly * months - capital;
}

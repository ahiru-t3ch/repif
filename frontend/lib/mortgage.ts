/** Defaults for the indicative mortgage simulator (frontend only). */
export const DEFAULT_LOAN_DOWN_PAYMENT = 0;
export const DEFAULT_LOAN_DURATION_YEARS = 25;
export const DEFAULT_LOAN_INTEREST_RATE = 3.5;
export const DEFAULT_LOAN_INSURANCE_RATE = 0.34;
/** Monthly rent as % of property price (rule of thumb). */
export const DEFAULT_RENT_MONTHLY_PCT = 0.35;
export const DEFAULT_ANNUAL_CHARGES = 0;
export const DEFAULT_PROPERTY_TAX = 0;
export const DEFAULT_NET_SALARY = 0;
/** Default exceptional charges as % of annual condo charges. */
export const DEFAULT_EXCEPTIONAL_CHARGES_PCT = 10;
/** Default annual maintenance as % of property value. */
export const DEFAULT_MAINTENANCE_PCT = 1;
/** Usual French bank max debt-to-income ratio (%). */
export const MAX_DEBT_RATIO_PCT = 33;
/** Default annual property appreciation for buy-vs-rent (%). */
export const DEFAULT_PROPERTY_APPRECIATION = 1;

export function loanPrincipal(loanBase: number, downPayment: number): number {
  return Math.max(0, loanBase - Math.max(0, downPayment));
}

/** Default monthly rent ≈ 0.35% of the property price. */
export function defaultMonthlyRent(propertyPrice: number): number {
  return Math.round(
    (Math.max(0, propertyPrice) * DEFAULT_RENT_MONTHLY_PCT) / 100,
  );
}

export function monthlyOwnershipCosts(
  annualCharges: number,
  propertyTax: number,
  annualMaintenance = 0,
): number {
  return (
    (Math.max(0, annualCharges) +
      Math.max(0, propertyTax) +
      Math.max(0, annualMaintenance)) /
    12
  );
}

/** Annual charges including optional exceptional buffer (% of condo charges). */
export function effectiveAnnualCharges(
  annualCharges: number,
  includeExceptional: boolean,
  exceptionalPct: number,
): number {
  const base = Math.max(0, annualCharges);
  if (!includeExceptional) {
    return base;
  }
  return base * (1 + Math.max(0, exceptionalPct) / 100);
}

/** Annual maintenance budget as % of property value. */
export function annualMaintenanceBudget(
  propertyPrice: number,
  include: boolean,
  maintenancePct: number,
): number {
  if (!include) {
    return 0;
  }
  return (Math.max(0, propertyPrice) * Math.max(0, maintenancePct)) / 100;
}

/**
 * Monthly amount that can be invested when renting instead of buying:
 * mortgage payment − rent + ownership costs avoided / 12.
 */
export function monthlyInvestableWhenRenting(
  loanMonthly: number,
  rent: number,
  annualCharges: number,
  propertyTax: number,
  annualMaintenance = 0,
): number {
  return Math.max(
    0,
    Math.max(0, loanMonthly) -
      Math.max(0, rent) +
      monthlyOwnershipCosts(annualCharges, propertyTax, annualMaintenance),
  );
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

/** Remaining principal after `yearsElapsed` of a constant-annuity loan. */
export function remainingLoanPrincipal(
  principal: number,
  annualInterestRatePct: number,
  durationYears: number,
  yearsElapsed: number,
): number {
  const capital = Math.max(0, principal);
  const n = Math.max(0, Math.round(durationYears * 12));
  const k = Math.min(n, Math.max(0, Math.round(yearsElapsed * 12)));
  if (capital <= 0 || n <= 0 || k >= n) {
    return 0;
  }

  const monthlyRate = annualInterestRatePct / 100 / 12;
  if (monthlyRate === 0) {
    return capital * (1 - k / n);
  }

  const powN = Math.pow(1 + monthlyRate, n);
  const powK = Math.pow(1 + monthlyRate, k);
  return (capital * (powN - powK)) / (powN - 1);
}

export function futurePropertyValue(
  propertyPrice: number,
  annualAppreciationPct: number,
  years: number,
): number {
  const price = Math.max(0, propertyPrice);
  const y = Math.max(0, years);
  const rate = annualAppreciationPct / 100;
  return price * Math.pow(1 + Math.max(0, rate), y);
}

/** Net worth if buying: future home value − remaining loan principal. */
export function buyNetWorth(
  propertyPrice: number,
  annualAppreciationPct: number,
  years: number,
  loanPrincipalAmount: number,
  annualInterestRatePct: number,
  durationYears: number,
): number {
  return (
    futurePropertyValue(propertyPrice, annualAppreciationPct, years) -
    remainingLoanPrincipal(
      loanPrincipalAmount,
      annualInterestRatePct,
      durationYears,
      years,
    )
  );
}

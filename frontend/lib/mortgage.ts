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

/**
 * Monthly cash left over when owning vs renting.
 * Positive only if rent would have cost more than the buy-side housing payment.
 */
export function monthlyRentSurplusWhenBuying(
  monthlyRent: number,
  loanMonthly: number,
  ownershipMonthly = 0,
): number {
  const buyHousingCost = Math.max(0, loanMonthly) + Math.max(0, ownershipMonthly);
  return Math.max(0, Math.max(0, monthlyRent) - buyHousingCost);
}

/** Cumulative rent surplus kept when owning instead of renting. */
export function rentSavedOverYears(
  monthlyRent: number,
  years: number,
  loanMonthly = 0,
  ownershipMonthly = 0,
): number {
  const months = Math.max(0, Math.round(years * 12));
  return (
    monthlyRentSurplusWhenBuying(monthlyRent, loanMonthly, ownershipMonthly) *
    months
  );
}

/** Gross rental yield (%) = annual rent / acquisition cost. */
export function grossRentalYield(
  monthlyRent: number,
  acquisitionCost: number,
): number | null {
  const cost = Math.max(0, acquisitionCost);
  if (cost <= 0) {
    return null;
  }
  return ((Math.max(0, monthlyRent) * 12) / cost) * 100;
}

/**
 * Net rental yield (%) before tax:
 * (annual rent − annual ownership costs) / acquisition cost.
 */
export function netRentalYield(
  monthlyRent: number,
  annualOwnershipCosts: number,
  acquisitionCost: number,
): number | null {
  const cost = Math.max(0, acquisitionCost);
  if (cost <= 0) {
    return null;
  }
  const netAnnual =
    Math.max(0, monthlyRent) * 12 - Math.max(0, annualOwnershipCosts);
  return (netAnnual / cost) * 100;
}

/** Monthly cash flow for a rental investment (can be negative). */
export function monthlyInvestmentCashFlow(
  monthlyRent: number,
  loanMonthly: number,
  ownershipMonthly = 0,
): number {
  return (
    Math.max(0, monthlyRent) -
    Math.max(0, loanMonthly) -
    Math.max(0, ownershipMonthly)
  );
}

/**
 * Cash-on-cash return (%) = annual cash flow / equity invested.
 * Equity = down payment with a loan, or full acquisition cost if cash.
 */
export function cashOnCashReturn(
  monthlyCashFlow: number,
  equityInvested: number,
): number | null {
  const equity = Math.max(0, equityInvested);
  if (equity <= 0) {
    return null;
  }
  return ((monthlyCashFlow * 12) / equity) * 100;
}

/** Simplified French unfurnished rental tax (revenus fonciers). */
export type RentalTaxRegime = "MICRO" | "REEL";

export const MARGINAL_TAX_RATES = [0, 11, 30, 41, 45] as const;
export type MarginalTaxRate = (typeof MARGINAL_TAX_RATES)[number];

/** Default household marginal income-tax bracket for the simple simulator. */
export const DEFAULT_MARGINAL_TAX_RATE: MarginalTaxRate = 30;
export const DEFAULT_RENTAL_TAX_REGIME: RentalTaxRegime = "MICRO";
/** Default occupancy rate for rental investment simulations (%). */
export const DEFAULT_OCCUPANCY_RATE = 70;
/** Occupancy rate choices: 50% → 100% by steps of 5. */
export const OCCUPANCY_RATE_OPTIONS = [
  50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
] as const;
export type OccupancyRate = (typeof OCCUPANCY_RATE_OPTIONS)[number];

/** Effective monthly rent after vacancy (occupancy %). */
export function effectiveMonthlyRent(
  monthlyRent: number,
  occupancyRatePct: number,
): number {
  const occupancy = Math.min(100, Math.max(0, occupancyRatePct)) / 100;
  return Math.max(0, monthlyRent) * occupancy;
}

/** Prélèvements sociaux on taxable rental income (%). */
export const RENTAL_SOCIAL_CONTRIBUTIONS_PCT = 17.2;
/** Micro-foncier forfaitary abatement (%). */
export const MICRO_FONCIER_ABATEMENT_PCT = 30;
/** Micro-foncier gross annual rent ceiling (€). */
export const MICRO_FONCIER_GROSS_CEILING = 15_000;

/** Interest paid during the first 12 months of a constant-annuity loan. */
export function annualLoanInterestFirstYear(
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
  const payment = monthlyLoanPayment(
    capital,
    annualInterestRatePct,
    durationYears,
  );
  let balance = capital;
  let interestTotal = 0;
  const monthsToCount = Math.min(12, months);

  for (let i = 0; i < monthsToCount; i += 1) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    interestTotal += interest;
    balance = Math.max(0, balance - (payment - interest));
  }

  return interestTotal;
}

export type RentalIncomeTaxBreakdown = {
  taxableBase: number;
  incomeTax: number;
  socialContributions: number;
  totalTax: number;
};

/**
 * Simplified annual tax on unfurnished rental income.
 * Micro: 30% abatement, no itemized deductions.
 * Réel: deduct ownership costs + first-year loan interest; deficit → tax 0.
 */
export function annualRentalIncomeTax(options: {
  monthlyRent: number;
  regime: RentalTaxRegime;
  marginalTaxRatePct: number;
  annualOwnershipCosts?: number;
  annualLoanInterest?: number;
}): RentalIncomeTaxBreakdown {
  const annualRent = Math.max(0, options.monthlyRent) * 12;
  const taxableBase =
    options.regime === "MICRO"
      ? annualRent * (1 - MICRO_FONCIER_ABATEMENT_PCT / 100)
      : Math.max(
          0,
          annualRent -
            Math.max(0, options.annualOwnershipCosts ?? 0) -
            Math.max(0, options.annualLoanInterest ?? 0),
        );

  const tmi = Math.max(0, options.marginalTaxRatePct) / 100;
  const social = RENTAL_SOCIAL_CONTRIBUTIONS_PCT / 100;
  const incomeTax = taxableBase * tmi;
  const socialContributions = taxableBase * social;

  return {
    taxableBase,
    incomeTax,
    socialContributions,
    totalTax: incomeTax + socialContributions,
  };
}

/**
 * Net-net rental yield (%) after ownership costs and income tax
 * (loan principal repayments excluded from the numerator).
 */
export function netNetRentalYield(
  monthlyRent: number,
  annualOwnershipCosts: number,
  annualTax: number,
  acquisitionCost: number,
): number | null {
  const cost = Math.max(0, acquisitionCost);
  if (cost <= 0) {
    return null;
  }
  const netAnnual =
    Math.max(0, monthlyRent) * 12 -
    Math.max(0, annualOwnershipCosts) -
    Math.max(0, annualTax);
  return (netAnnual / cost) * 100;
}

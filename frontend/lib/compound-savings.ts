export const DEFAULT_SAVINGS_RATE = 3;
export const DEFAULT_INFLATION_RATE = 2;
/** Horizon used for the investing comparison when buying cash (no mortgage). */
export const DEFAULT_CASH_SAVINGS_YEARS = 10;

export type SavingsSnapshot = {
  futureValue: number;
  totalContributions: number;
  totalInterest: number;
  interestSharePct: number;
};

export type SavingsYearPoint = {
  year: number;
  contributions: number;
  interest: number;
  total: number;
};

/** Future value with monthly compounding and end-of-month deposits. */
export function futureValue(
  initialCapital: number,
  monthlyDeposit: number,
  annualRatePct: number,
  years: number,
): number {
  const C = Math.max(0, initialCapital);
  const P = Math.max(0, monthlyDeposit);
  const n = Math.max(0, Math.round(years * 12));
  if (n <= 0) {
    return C;
  }

  const r = annualRatePct / 100 / 12;
  if (r === 0) {
    return C + P * n;
  }

  const growth = Math.pow(1 + r, n);
  return C * growth + (P * (growth - 1)) / r;
}

/** Nominal amount expressed in today's purchasing power. */
export function inflationAdjustedValue(
  nominalValue: number,
  annualInflationPct: number,
  years: number,
): number {
  const value = Math.max(0, nominalValue);
  const y = Math.max(0, years);
  if (y <= 0) {
    return value;
  }
  const i = Math.max(0, annualInflationPct) / 100;
  if (i === 0) {
    return value;
  }
  return value / Math.pow(1 + i, y);
}

export function savingsSnapshot(
  initialCapital: number,
  monthlyDeposit: number,
  annualRatePct: number,
  years: number,
): SavingsSnapshot {
  const C = Math.max(0, initialCapital);
  const P = Math.max(0, monthlyDeposit);
  const n = Math.max(0, Math.round(years * 12));
  const fv = futureValue(C, P, annualRatePct, years);
  const contributions = C + P * n;
  const interest = Math.max(0, fv - contributions);
  const interestSharePct = fv > 0 ? (interest / fv) * 100 : 0;

  return {
    futureValue: fv,
    totalContributions: contributions,
    totalInterest: interest,
    interestSharePct,
  };
}

/** Year-end series for chart (contributions vs interest). */
export function yearlySeries(
  initialCapital: number,
  monthlyDeposit: number,
  annualRatePct: number,
  years: number,
): SavingsYearPoint[] {
  const maxYears = Math.max(0, Math.floor(years));
  const points: SavingsYearPoint[] = [];

  for (let year = 1; year <= maxYears; year += 1) {
    const snap = savingsSnapshot(
      initialCapital,
      monthlyDeposit,
      annualRatePct,
      year,
    );
    points.push({
      year,
      contributions: snap.totalContributions,
      interest: snap.totalInterest,
      total: snap.futureValue,
    });
  }

  return points;
}

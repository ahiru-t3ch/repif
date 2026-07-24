export function formatPrice(intlLocale: string, value: number): string {
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatFeeRate(intlLocale: string, rate: number): string {
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 1,
  }).format(rate);
}

export function formatPricePerSqm(
  intlLocale: string,
  netPrice: number,
  surface: number,
): string | null {
  if (surface <= 0) {
    return null;
  }

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(netPrice / surface));
}

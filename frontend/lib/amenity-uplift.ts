import type { PropertyType } from "@/lib/estimate-session/context";

/** Mid-range market premiums (fraction of price) by property type. */
const AMENITY_UPLIFT: Record<
  PropertyType,
  { balcony: number; garden: number; pool: number }
> = {
  HOUSE: {
    /** Often already priced into the garden — not applied. */
    balcony: 0,
    garden: 0.115,
    pool: 0.18,
  },
  APARTMENT: {
    balcony: 0.09,
    garden: 0.2,
    pool: 0.065,
  },
};

export function isBalconyApplicable(propertyType: PropertyType): boolean {
  return propertyType === "APARTMENT";
}

/**
 * Raise the central estimate from checked amenities.
 * Premiums are additive on the base price, then capped at price_high (MAPE band).
 */
export function applyAmenityUplift(
  price: number,
  priceHigh: number,
  propertyType: PropertyType,
  amenities: { balcony: boolean; garden: boolean; pool: boolean },
): number {
  const rates = AMENITY_UPLIFT[propertyType];
  let upliftPct = 0;

  if (amenities.balcony && isBalconyApplicable(propertyType)) {
    upliftPct += rates.balcony;
  }
  if (amenities.garden) {
    upliftPct += rates.garden;
  }
  if (amenities.pool) {
    upliftPct += rates.pool;
  }

  if (upliftPct <= 0) {
    return price;
  }

  const uplifted = price * (1 + upliftPct);
  return Math.min(uplifted, Math.max(price, priceHigh));
}

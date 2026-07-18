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

/** Floor band for apartments (empty = not specified → 0%). */
export type ApartmentFloor =
  | ""
  | "GROUND"
  | "FLOOR_1"
  | "FLOOR_2_3"
  | "FLOOR_4"
  | "FLOOR_5_6"
  | "TOP";

export const APARTMENT_FLOOR_OPTIONS: Exclude<ApartmentFloor, "">[] = [
  "GROUND",
  "FLOOR_1",
  "FLOOR_2_3",
  "FLOOR_4",
  "FLOOR_5_6",
  "TOP",
];

/** Mid-range floor adjustments: [withElevator, withoutElevator]. */
const FLOOR_ADJUSTMENT: Record<
  Exclude<ApartmentFloor, "">,
  { withElevator: number; withoutElevator: number }
> = {
  GROUND: { withElevator: -0.175, withoutElevator: -0.175 },
  FLOOR_1: { withElevator: -0.075, withoutElevator: 0.075 },
  FLOOR_2_3: { withElevator: 0, withoutElevator: 0 },
  FLOOR_4: { withElevator: 0.075, withoutElevator: -0.075 },
  FLOOR_5_6: { withElevator: 0.15, withoutElevator: -0.225 },
  TOP: { withElevator: 0.225, withoutElevator: -0.275 },
};

export function isBalconyApplicable(propertyType: PropertyType): boolean {
  return propertyType === "APARTMENT";
}

export function isFloorAdjustmentApplicable(
  propertyType: PropertyType,
): boolean {
  return propertyType === "APARTMENT";
}

function amenityAdjustmentPct(
  propertyType: PropertyType,
  amenities: { balcony: boolean; garden: boolean; pool: boolean },
): number {
  const rates = AMENITY_UPLIFT[propertyType];
  let pct = 0;
  if (amenities.balcony && isBalconyApplicable(propertyType)) {
    pct += rates.balcony;
  }
  if (amenities.garden) {
    pct += rates.garden;
  }
  if (amenities.pool) {
    pct += rates.pool;
  }
  return pct;
}

function floorAdjustmentPct(
  propertyType: PropertyType,
  floor: ApartmentFloor,
  hasElevator: boolean,
): number {
  if (!isFloorAdjustmentApplicable(propertyType) || !floor) {
    return 0;
  }
  const band = FLOOR_ADJUSTMENT[floor];
  return hasElevator ? band.withElevator : band.withoutElevator;
}

/**
 * Apply amenity + floor market adjustments on the model price,
 * then clamp inside the MAPE band [priceLow, priceHigh].
 */
export function applyMarketAdjustments(
  price: number,
  priceLow: number,
  priceHigh: number,
  propertyType: PropertyType,
  options: {
    balcony: boolean;
    garden: boolean;
    pool: boolean;
    floor?: ApartmentFloor;
    hasElevator?: boolean;
  },
): number {
  const totalPct =
    amenityAdjustmentPct(propertyType, options) +
    floorAdjustmentPct(
      propertyType,
      options.floor ?? "",
      Boolean(options.hasElevator),
    );

  if (totalPct === 0) {
    return price;
  }

  const adjusted = price * (1 + totalPct);
  const low = Math.min(priceLow, priceHigh);
  const high = Math.max(priceLow, priceHigh);
  return Math.min(high, Math.max(low, adjusted));
}

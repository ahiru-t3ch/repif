import type { PropertyType } from "@/lib/estimate-session/context";
import {
  conditionAdjustmentPct,
  type ConditionRatings,
} from "@/lib/property-condition";

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

/**
 * Mid-range discount for large towers / low-demand residences
 * (liquidity, image, high charges → softer negotiation).
 * Apartment only.
 */
export const UNPOPULAR_TOWER_DISCOUNT = 0.1;

export function isUnpopularTowerApplicable(
  propertyType: PropertyType,
): boolean {
  return propertyType === "APARTMENT";
}

/**
 * Relative floor band derived from (floor, building storeys).
 * Floor 0 = RDC; buildingStoreys = numéro du dernier étage (ex. 30).
 */
export type RelativeFloorBand =
  | "GROUND"
  | "FLOOR_1"
  | "LOW_MID"
  | "MID_HIGH"
  | "HIGH"
  | "TOP";

/** Mid-range floor adjustments: with / without elevator. */
const FLOOR_ADJUSTMENT: Record<
  RelativeFloorBand,
  { withElevator: number; withoutElevator: number }
> = {
  GROUND: { withElevator: -0.175, withoutElevator: -0.175 },
  FLOOR_1: { withElevator: -0.075, withoutElevator: 0.075 },
  LOW_MID: { withElevator: 0, withoutElevator: 0 },
  MID_HIGH: { withElevator: 0.075, withoutElevator: -0.075 },
  HIGH: { withElevator: 0.15, withoutElevator: -0.225 },
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

/**
 * Map absolute floor + building height to a market band.
 * @param floor 0 = RDC, 1 = 1er, … up to buildingStoreys (dernier)
 * @param buildingStoreys numéro du dernier étage (ex. 30 pour une tour de 30)
 */
export function resolveFloorBand(
  floor: number,
  buildingStoreys: number,
): RelativeFloorBand | null {
  if (!Number.isFinite(floor) || !Number.isFinite(buildingStoreys)) {
    return null;
  }
  const f = Math.round(floor);
  const max = Math.round(buildingStoreys);
  if (max < 1 || f < 0 || f > max) {
    return null;
  }
  if (f === 0) {
    return "GROUND";
  }
  if (f === max) {
    return "TOP";
  }

  // Small buildings: keep absolute intuition (RDC → 6e).
  if (max <= 6) {
    if (f === 1) {
      return "FLOOR_1";
    }
    if (f <= 3) {
      return "LOW_MID";
    }
    if (f === 4) {
      return "MID_HIGH";
    }
    return "HIGH";
  }

  // Tall buildings: relative height (ex. 9/30 ≈ milieu → LOW_MID = 0%).
  if (f === 1) {
    return "FLOOR_1";
  }
  const relative = f / max;
  if (relative < 0.35) {
    return "LOW_MID";
  }
  if (relative < 0.55) {
    return "MID_HIGH";
  }
  return "HIGH";
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
  floor: number | null | undefined,
  buildingStoreys: number | null | undefined,
  hasElevator: boolean,
): number {
  if (
    !isFloorAdjustmentApplicable(propertyType) ||
    floor == null ||
    buildingStoreys == null
  ) {
    return 0;
  }
  const band = resolveFloorBand(floor, buildingStoreys);
  if (!band) {
    return 0;
  }
  const rates = FLOOR_ADJUSTMENT[band];
  return hasElevator ? rates.withElevator : rates.withoutElevator;
}

function towerAdjustmentPct(
  propertyType: PropertyType,
  unpopularTower: boolean,
): number {
  if (!unpopularTower || !isUnpopularTowerApplicable(propertyType)) {
    return 0;
  }
  return -UNPOPULAR_TOWER_DISCOUNT;
}

/**
 * Apply amenity + floor + tower + condition market adjustments on the model price,
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
    floor?: number | null;
    buildingStoreys?: number | null;
    hasElevator?: boolean;
    unpopularTower?: boolean;
    conditionRatings?: ConditionRatings | null;
  },
): number {
  const totalPct =
    amenityAdjustmentPct(propertyType, options) +
    floorAdjustmentPct(
      propertyType,
      options.floor,
      options.buildingStoreys,
      Boolean(options.hasElevator),
    ) +
    towerAdjustmentPct(propertyType, Boolean(options.unpopularTower)) +
    conditionAdjustmentPct(options.conditionRatings);

  if (totalPct === 0) {
    return price;
  }

  const adjusted = price * (1 + totalPct);
  const low = Math.min(priceLow, priceHigh);
  const high = Math.max(priceLow, priceHigh);
  return Math.min(high, Math.max(low, adjusted));
}

/** Condition posts rated 1 (to redo) → 5 (excellent). null = not rated. */
export type ConditionPost =
  | "kitchen"
  | "bathroom"
  | "floors"
  | "paint"
  | "electricsPlumbing"
  | "windows"
  | "heating";

export type ConditionRating = 1 | 2 | 3 | 4 | 5;

export type ConditionRatings = Record<ConditionPost, ConditionRating | null>;

export const CONDITION_POSTS: readonly ConditionPost[] = [
  "kitchen",
  "bathroom",
  "floors",
  "paint",
  "electricsPlumbing",
  "windows",
  "heating",
] as const;

export const CONDITION_RATING_OPTIONS: readonly ConditionRating[] = [
  1, 2, 3, 4, 5,
] as const;

/** Heavier weight on kitchen, bathroom, and technical posts. */
const CONDITION_WEIGHTS: Record<ConditionPost, number> = {
  kitchen: 1.5,
  bathroom: 1.5,
  electricsPlumbing: 1.4,
  windows: 1.2,
  heating: 1.2,
  floors: 1.0,
  paint: 0.8,
};

/** Score 3 = market-average finish → 0% adjustment. */
export const CONDITION_NEUTRAL_SCORE = 3;

/** At score 1 (all posts to redo). */
export const CONDITION_PCT_AT_MIN = -0.15;

/** At score 5 (all posts excellent). */
export const CONDITION_PCT_AT_MAX = 0.08;

export function createEmptyConditionRatings(): ConditionRatings {
  return {
    kitchen: null,
    bathroom: null,
    floors: null,
    paint: null,
    electricsPlumbing: null,
    windows: null,
    heating: null,
  };
}

export function hasAnyConditionRating(ratings: ConditionRatings): boolean {
  return CONDITION_POSTS.some((post) => ratings[post] != null);
}

/**
 * Weighted average of filled posts only.
 * Returns null if nothing was rated.
 */
export function computeOverallConditionScore(
  ratings: ConditionRatings,
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const post of CONDITION_POSTS) {
    const rating = ratings[post];
    if (rating == null) {
      continue;
    }
    const weight = CONDITION_WEIGHTS[post];
    weightedSum += rating * weight;
    weightTotal += weight;
  }
  if (weightTotal === 0) {
    return null;
  }
  return weightedSum / weightTotal;
}

/**
 * Map overall score to indicative price adjustment.
 * 1 → −15 %, 3 → 0 %, 5 → +8 % (asymmetric around market average).
 */
export function conditionScoreToAdjustmentPct(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  const clamped = Math.min(5, Math.max(1, score));
  if (clamped <= CONDITION_NEUTRAL_SCORE) {
    // 1 → −15 %, 3 → 0 %
    return (
      ((clamped - CONDITION_NEUTRAL_SCORE) / (CONDITION_NEUTRAL_SCORE - 1)) *
      Math.abs(CONDITION_PCT_AT_MIN)
    );
  }
  // 3 → 0 %, 5 → +8 %
  return (
    ((clamped - CONDITION_NEUTRAL_SCORE) / (5 - CONDITION_NEUTRAL_SCORE)) *
    CONDITION_PCT_AT_MAX
  );
}

export function conditionAdjustmentPct(
  ratings: ConditionRatings | null | undefined,
): number {
  if (!ratings) {
    return 0;
  }
  const score = computeOverallConditionScore(ratings);
  if (score == null) {
    return 0;
  }
  return conditionScoreToAdjustmentPct(score);
}

export function parseConditionRating(
  value: string,
): ConditionRating | null {
  if (value === "") {
    return null;
  }
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) {
    return n;
  }
  return null;
}

/** Normalize partial / legacy payloads into a full ratings object. */
export function normalizeConditionRatings(
  value: unknown,
): ConditionRatings {
  const empty = createEmptyConditionRatings();
  if (!value || typeof value !== "object") {
    return empty;
  }
  const raw = value as Partial<Record<ConditionPost, unknown>>;
  for (const post of CONDITION_POSTS) {
    const rating = raw[post];
    if (rating === 1 || rating === 2 || rating === 3 || rating === 4 || rating === 5) {
      empty[post] = rating;
    }
  }
  return empty;
}

/**
 * Estimated kcal burned per minute by activity type (~70 kg adult; MET-inspired).
 * Keys must stay in sync with `ActivityType` in activity-actions.
 * For UI suggestions only — not medical advice.
 */
export const KCAL_PER_MINUTE = {
  walk: 4,
  run: 11,
  strength: 6,
  yoga: 3,
  cardio: 9,
  other: 5,
} as const;

export type ActivityKcalKey = keyof typeof KCAL_PER_MINUTE;

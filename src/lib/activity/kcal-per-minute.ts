/**
 * Estimated kcal burned per minute by activity type (~70 kg adult; MET-inspired).
 * Keys must stay in sync with `ActivityType` in activity-actions.
 * For UI suggestions only — not medical advice.
 */
export const KCAL_PER_MINUTE = {
  walk: 4,
  run: 11,
  cycling: 8,
  swimming: 9,
  cardio: 9,
  hiit: 11,
  jump_rope: 11,
  dance: 6,
  basketball: 8,
  tennis: 7,
  badminton: 7,
  strength: 6,
  yoga: 3,
  pilates: 3,
  stretching: 2,
  other: 5,
} as const;

export type ActivityKcalKey = keyof typeof KCAL_PER_MINUTE;

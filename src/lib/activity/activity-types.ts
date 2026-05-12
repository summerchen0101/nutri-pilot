export const ACTIVITY_TYPES = [
  'walk',
  'run',
  'cycling',
  'stationary_bike',
  'spin_bike',
  'swimming',
  'cardio',
  'hiit',
  'jump_rope',
  'dance',
  'basketball',
  'tennis',
  'badminton',
  'strength',
  'yoga',
  'pilates',
  'stretching',
  'other',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

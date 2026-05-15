import type { ActivityType } from '@/lib/activity/activity-types';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type QuickLogFoodProposal = {
  kind: 'food';
  mealType: MealType;
  date: string;
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
};

export type QuickLogActivityProposal = {
  kind: 'activity';
  loggedDate: string;
  activityType: ActivityType;
  durationMinutes: number;
  caloriesEst: number | null;
  notes: string | null;
};

export type QuickLogWeightProposal = {
  kind: 'weight';
  dateIso: string;
  weightKg: number;
};

export type QuickLogWaterProposal = {
  kind: 'water';
  dateIso: string;
  waterMlTotal: number;
};

export type QuickLogSleepProposal = {
  kind: 'sleep';
  dateIso: string;
  sleepHours: number;
};

export type QuickLogValidatedEntry =
  | QuickLogFoodProposal
  | QuickLogActivityProposal
  | QuickLogWeightProposal
  | QuickLogWaterProposal
  | QuickLogSleepProposal;

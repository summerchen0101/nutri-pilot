import type { ActivityType } from '@/lib/activity/activity-types';

export const ACTIVITY_GROUPS: readonly {
  readonly label: string;
  readonly types: readonly ActivityType[];
}[] = [
  {
    label: '有氧與心肺',
    types: [
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
    ],
  },
  { label: '球類', types: ['basketball', 'tennis', 'badminton'] },
  { label: '肌力', types: ['strength'] },
  { label: '瑜珈與伸展', types: ['yoga', 'pilates', 'stretching'] },
  { label: '其他', types: ['other'] },
];

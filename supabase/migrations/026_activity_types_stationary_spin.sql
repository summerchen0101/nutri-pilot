-- 運動類型：室內健身車、飛輪（activity_logs.activity_type CHECK）

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_activity_type_check CHECK (
  activity_type IN (
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
    'other'
  )
);

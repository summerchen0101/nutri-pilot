-- 擴充 activity_logs.activity_type：健身／瑜珈常用類型

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_activity_type_check CHECK (
  activity_type IN (
    'walk',
    'run',
    'strength',
    'yoga',
    'cardio',
    'other',
    'pilates',
    'stretching',
    'hiit',
    'cycling',
    'swimming',
    'dance'
  )
);

-- 個人化健康／飲食脈絡（多面向 JSON，見 docs/changes）
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS personal_context_facets jsonb DEFAULT NULL;

COMMENT ON COLUMN user_profiles.personal_context_facets IS '口述整理後之個人化面向（JSON）；不含原始長文；供 AI 與設定頁摘要';

-- ai_usage_events.source：新增個人化整理與首頁建議
ALTER TABLE ai_usage_events DROP CONSTRAINT IF EXISTS ai_usage_events_source_check;

ALTER TABLE ai_usage_events
  ADD CONSTRAINT ai_usage_events_source_check
  CHECK (source IN (
    'photo_meal',
    'label_guard',
    'quick_log',
    'analyze_food',
    'personal_context_extract',
    'dashboard_insight'
  ));

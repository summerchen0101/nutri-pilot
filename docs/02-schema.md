# 資料庫 Schema（精簡 MVP 版）

> 直接對應 Supabase PostgreSQL。  
> 不使用 Prisma，所有 migration 用 Supabase Studio 或 SQL 檔案管理。  
> 移除了：睡眠/運動詳細欄位、血糖血壓追蹤、購物清單、成就系統。

---

## Row Level Security（RLS）原則

**所有資料表都啟用 RLS**，每張表的基本政策：
```sql
-- 用戶只能存取自己的資料
CREATE POLICY "Users can access own data"
ON table_name FOR ALL
USING (auth.uid() = user_id);
```

---

## 1. 用戶相關

```sql
-- 用戶基本資料（Supabase Auth 的 users 表自動建立，這裡是額外的 profile）
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本資料
  name          TEXT NOT NULL,
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  birth_date    DATE NOT NULL,
  activity_level TEXT NOT NULL CHECK (activity_level IN (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  )),

  -- 身體數據
  height_cm     NUMERIC(5,1) NOT NULL,
  weight_kg     NUMERIC(5,1) NOT NULL,

  -- 計算欄位（自動更新，不要手動寫）
  bmi           NUMERIC(4,1),
  bmr           NUMERIC(7,1),
  tdee          NUMERIC(7,1),

  -- 飲食偏好
  diet_type     TEXT NOT NULL CHECK (diet_type IN ('omnivore', 'vegetarian', 'vegan')),
  meal_frequency INT NOT NULL DEFAULT 3,

  -- 忌食與過敏（陣列）
  avoid_foods   TEXT[] DEFAULT '{}',
  allergens     TEXT[] DEFAULT '{}',

  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 用戶目標
CREATE TABLE user_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('lose_weight', 'gain_muscle', 'maintain')),
  target_weight_kg NUMERIC(5,1) NOT NULL,
  weekly_rate_kg  NUMERIC(3,1) NOT NULL DEFAULT 0.5,
  daily_cal_target NUMERIC(7,1) NOT NULL,
  target_date     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. 飲食計畫

```sql
-- 飲食計畫（用戶選擇的飲食法與時長）
CREATE TABLE diet_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_method   TEXT NOT NULL CHECK (diet_method IN (
    'mediterranean', 'keto', 'high_protein', 'low_cal', 'intermittent', 'dash', 'custom'
  )),
  duration_days INT NOT NULL CHECK (duration_days IN (7, 14, 21, 30)),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,

  -- 巨量營養素比例目標
  carb_pct      NUMERIC(4,1) DEFAULT 45,
  protein_pct   NUMERIC(4,1) DEFAULT 30,
  fat_pct       NUMERIC(4,1) DEFAULT 25,

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 每日菜單（AI 生成，有生成狀態）
CREATE TABLE daily_menus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  total_calories  NUMERIC(7,1),
  is_completed    BOOLEAN DEFAULT FALSE,
  completion_pct  NUMERIC(4,1),
  generated_by_ai BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, date)
);

-- 每餐
CREATE TABLE meals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id       UUID NOT NULL REFERENCES daily_menus(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  scheduled_at  TIME,
  is_checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  total_calories NUMERIC(7,1),
  -- 打卡方式（與飲食記錄關聯；migration 009）
  -- NULL：尚未打卡；'exact'：照吃；'modified'：照吃但調整；'skipped'：沒吃這餐
  checkin_type  TEXT
);

-- 餐點食材
CREATE TABLE meal_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id     UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity_g  NUMERIC(7,1) NOT NULL,
  calories    NUMERIC(7,1) NOT NULL,
  carb_g      NUMERIC(6,1) NOT NULL,
  protein_g   NUMERIC(6,1) NOT NULL,
  fat_g       NUMERIC(6,1) NOT NULL,
  fiber_g     NUMERIC(6,1),
  sodium_mg   NUMERIC(7,1)
);
```

---

## 3. 飲食記錄

```sql
-- 飲食記錄（用戶每天手動 or 拍照記錄）
CREATE TABLE food_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  method    TEXT NOT NULL CHECK (method IN ('manual', 'photo', 'search')),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  -- 與計畫餐別關聯（migration 009）；計畫餐刪除時 ON DELETE SET NULL
  from_plan_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  -- 'manual'：用戶自己搜尋記錄；'from_plan'：照計畫打卡自動複製；'from_plan_modified'：照計畫但有調整（預設 manual）
  log_type  TEXT NOT NULL DEFAULT 'manual'
);

-- 記錄的食物項目
CREATE TABLE food_log_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id      UUID NOT NULL REFERENCES food_logs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity_g  NUMERIC(7,1) NOT NULL,
  calories    NUMERIC(7,1) NOT NULL,
  carb_g      NUMERIC(6,1) NOT NULL,
  protein_g   NUMERIC(6,1) NOT NULL,
  fat_g       NUMERIC(6,1) NOT NULL,
  fiber_g     NUMERIC(6,1),
  sodium_mg   NUMERIC(7,1),
  brand       TEXT
);

-- 體重記錄（精簡版，只保留和商城推薦有關的指標）
CREATE TABLE vital_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  weight_kg   NUMERIC(5,1),
  water_ml    INT,
  logged_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 食品營養快取（Open Food Facts / 衛福部 / USDA / AI 估算等；migration 002 建立、004 擴充）
CREATE TABLE food_cache (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  off_code            TEXT,
  source              TEXT NOT NULL DEFAULT 'off'
                      CHECK (source IN ('off', 'mohw_tw', 'usda', 'ai_estimate', 'user')),
  external_id         TEXT,
  name                TEXT NOT NULL,
  alias               TEXT[],
  brand               TEXT,
  calories_per_100g   NUMERIC(10,2) NOT NULL,
  carb_g_per_100g     NUMERIC(10,2) NOT NULL DEFAULT 0,
  protein_g_per_100g  NUMERIC(10,2) NOT NULL DEFAULT 0,
  fat_g_per_100g      NUMERIC(10,2) NOT NULL DEFAULT 0,
  fiber_g_per_100g    NUMERIC(10,2),
  sodium_mg_per_100g  NUMERIC(10,2),
  is_verified         BOOLEAN DEFAULT FALSE,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE NULLS DISTINCT (off_code)
);

CREATE INDEX food_cache_name_lower ON food_cache (lower(name));
CREATE INDEX food_cache_name_search ON food_cache USING gin(to_tsvector('simple', name));
```

---

## 4. 健康商城

```sql
-- 品牌
CREATE TABLE brands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  country     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 商品
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID NOT NULL REFERENCES brands(id),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  image_url     TEXT,
  category      TEXT NOT NULL CHECK (category IN (
    'nuts', 'protein_bar', 'supplement', 'drink', 'snack', 'meal_replacement'
  )),

  -- 每份營養（推薦引擎的核心輸入）
  serving_size_g  NUMERIC(6,1) NOT NULL,
  calories        NUMERIC(6,1) NOT NULL,
  carb_g          NUMERIC(6,1) NOT NULL,
  protein_g       NUMERIC(6,1) NOT NULL,
  fat_g           NUMERIC(6,1) NOT NULL,
  fiber_g         NUMERIC(6,1),
  sugar_g         NUMERIC(6,1),
  sodium_mg       NUMERIC(7,1),

  -- 推薦引擎的標籤（陣列）
  diet_tags     TEXT[] DEFAULT '{}',   -- ['mediterranean', 'keto', 'high_protein']
  cert_tags     TEXT[] DEFAULT '{}',   -- ['organic', 'non_gmo', 'iso22000']
  allergen_free TEXT[] DEFAULT '{}',   -- 不含這些過敏原：['peanut', 'shellfish', 'gluten']

  -- 成分與產地
  ingredients   TEXT,
  origin        TEXT,

  is_active     BOOLEAN DEFAULT TRUE,
  avg_rating    NUMERIC(2,1) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 商品規格（一個商品可以有多種重量/包裝）
CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,           -- '35g 隨手包'
  weight_g    NUMERIC(7,1) NOT NULL,
  price       NUMERIC(8,2) NOT NULL,
  sub_price   NUMERIC(8,2),            -- 訂閱價（通常有折扣）
  stock       INT DEFAULT 0,
  stripe_price_id     TEXT,            -- 一次性購買的 Stripe Price ID
  stripe_sub_price_id TEXT             -- 訂閱的 Stripe Price ID
);

-- 訂單
CREATE TABLE orders (
  id                TEXT PRIMARY KEY,  -- Stripe Payment Intent ID
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  total             NUMERIC(10,2) NOT NULL,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 訂單項目
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT NOT NULL REFERENCES orders(id),
  variant_id  UUID NOT NULL REFERENCES product_variants(id),
  qty         INT NOT NULL,
  unit_price  NUMERIC(8,2) NOT NULL
);

-- 訂閱（使用 Stripe Billing，這裡只存同步狀態）
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,   -- 主鍵在 Stripe 那邊
  stripe_customer_id    TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  frequency             TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_ship_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 訂閱項目
CREATE TABLE subscription_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  variant_id          UUID NOT NULL REFERENCES product_variants(id),
  stripe_item_id      TEXT,           -- Stripe Subscription Item ID
  qty                 INT NOT NULL
);

-- 用戶商品推薦分數快取（避免每次進商城都重算）
CREATE TABLE user_product_scores (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score      NUMERIC(6,1) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);
```

---

## 公告與已讀（App 鈴鐺／公告頁）

後台透過 Supabase Studio（service role）維護 `announcements`；使用者端僅能 **SELECT** 符合 `is_active AND published_at <= now()` 的列。

```sql
CREATE TABLE announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_announcement_reads (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id  UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);
```

---

## 觸發器與自動化

```sql
-- 更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 用戶建立時自動建立空 profile（觸發自 Supabase Auth webhook）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, name, gender, birth_date, activity_level, height_cm, weight_kg, diet_type)
  VALUES (NEW.id, '', 'other', NOW(), 'moderate', 0, 0, 'omnivore');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 推薦分數重算觸發（用戶 profile 更新時）
-- 實作：Edge Function 接收 Supabase Webhook → 重算 user_product_scores
```

---

## 型別生成指令

```bash
# 每次 schema 改動後執行
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

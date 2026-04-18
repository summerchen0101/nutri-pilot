-- Nutri Guard MVP schema (docs/02-schema.md)
-- Run in Supabase Studio SQL editor or via CLI.

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  birth_date    DATE NOT NULL,
  activity_level TEXT NOT NULL CHECK (activity_level IN (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  )),

  height_cm     NUMERIC(5,1) NOT NULL,
  weight_kg     NUMERIC(5,1) NOT NULL,

  bmi           NUMERIC(4,1),
  bmr           NUMERIC(7,1),
  tdee          NUMERIC(7,1),

  diet_type     TEXT NOT NULL CHECK (diet_type IN ('omnivore', 'vegetarian', 'vegan')),
  meal_frequency INT NOT NULL DEFAULT 3,

  avoid_foods   TEXT[] DEFAULT '{}',
  allergens     TEXT[] DEFAULT '{}',

  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

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

  carb_pct      NUMERIC(4,1) DEFAULT 45,
  protein_pct   NUMERIC(4,1) DEFAULT 30,
  fat_pct       NUMERIC(4,1) DEFAULT 25,

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE meals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id       UUID NOT NULL REFERENCES daily_menus(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  scheduled_at  TIME,
  is_checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  total_calories NUMERIC(7,1)
);

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

CREATE TABLE food_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  method    TEXT NOT NULL CHECK (method IN ('manual', 'photo', 'search')),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE vital_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  weight_kg   NUMERIC(5,1),
  water_ml    INT,
  logged_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

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

  serving_size_g  NUMERIC(6,1) NOT NULL,
  calories        NUMERIC(6,1) NOT NULL,
  carb_g          NUMERIC(6,1) NOT NULL,
  protein_g       NUMERIC(6,1) NOT NULL,
  fat_g           NUMERIC(6,1) NOT NULL,
  fiber_g         NUMERIC(6,1),
  sugar_g         NUMERIC(6,1),
  sodium_mg       NUMERIC(7,1),

  diet_tags     TEXT[] DEFAULT '{}',
  cert_tags     TEXT[] DEFAULT '{}',
  allergen_free TEXT[] DEFAULT '{}',

  ingredients   TEXT,
  origin        TEXT,

  is_active     BOOLEAN DEFAULT TRUE,
  avg_rating    NUMERIC(2,1) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  weight_g    NUMERIC(7,1) NOT NULL,
  price       NUMERIC(8,2) NOT NULL,
  sub_price   NUMERIC(8,2),
  stock       INT DEFAULT 0,
  stripe_price_id     TEXT,
  stripe_sub_price_id TEXT
);

CREATE TABLE orders (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  total             NUMERIC(10,2) NOT NULL,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT NOT NULL REFERENCES orders(id),
  variant_id  UUID NOT NULL REFERENCES product_variants(id),
  qty         INT NOT NULL,
  unit_price  NUMERIC(8,2) NOT NULL
);

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id    TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  frequency             TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_ship_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  variant_id          UUID NOT NULL REFERENCES product_variants(id),
  stripe_item_id      TEXT,
  qty                 INT NOT NULL
);

CREATE TABLE user_product_scores (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score      NUMERIC(6,1) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- -----------------------------------------------------------------------------
-- Functions & triggers (docs/02-schema.md)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_subscriptions
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, name, gender, birth_date, activity_level, height_cm, weight_kg, diet_type)
  VALUES (NEW.id, '', 'other', CURRENT_DATE, 'moderate', 0, 0, 'omnivore');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_product_scores ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "Users can access own user_profiles"
ON user_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_goals
CREATE POLICY "Users can access own user_goals"
ON user_goals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- diet_plans
CREATE POLICY "Users can access own diet_plans"
ON diet_plans FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- daily_menus
CREATE POLICY "Users can access own daily_menus"
ON daily_menus FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = daily_menus.plan_id AND dp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = daily_menus.plan_id AND dp.user_id = auth.uid()
  )
);

-- meals
CREATE POLICY "Users can access own meals"
ON meals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM daily_menus dm
    JOIN diet_plans dp ON dp.id = dm.plan_id
    WHERE dm.id = meals.menu_id AND dp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_menus dm
    JOIN diet_plans dp ON dp.id = dm.plan_id
    WHERE dm.id = meals.menu_id AND dp.user_id = auth.uid()
  )
);

-- meal_items
CREATE POLICY "Users can access own meal_items"
ON meal_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM meals m
    JOIN daily_menus dm ON dm.id = m.menu_id
    JOIN diet_plans dp ON dp.id = dm.plan_id
    WHERE m.id = meal_items.meal_id AND dp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meals m
    JOIN daily_menus dm ON dm.id = m.menu_id
    JOIN diet_plans dp ON dp.id = dm.plan_id
    WHERE m.id = meal_items.meal_id AND dp.user_id = auth.uid()
  )
);

-- food_logs
CREATE POLICY "Users can access own food_logs"
ON food_logs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- food_log_items
CREATE POLICY "Users can access own food_log_items"
ON food_log_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM food_logs fl
    WHERE fl.id = food_log_items.log_id AND fl.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM food_logs fl
    WHERE fl.id = food_log_items.log_id AND fl.user_id = auth.uid()
  )
);

-- vital_logs
CREATE POLICY "Users can access own vital_logs"
ON vital_logs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Catalog (shop): readable when active
CREATE POLICY "Anyone can view active brands"
ON brands FOR SELECT
USING (is_active = true);

CREATE POLICY "Anyone can view active products"
ON products FOR SELECT
USING (is_active = true);

CREATE POLICY "Anyone can view variants of active products"
ON product_variants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = product_variants.product_id AND p.is_active = true
  )
);

-- orders
CREATE POLICY "Users can access own orders"
ON orders FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- order_items
CREATE POLICY "Users can access own order_items"
ON order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);

-- subscriptions
CREATE POLICY "Users can access own subscriptions"
ON subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- subscription_items
CREATE POLICY "Users can access own subscription_items"
ON subscription_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.id = subscription_items.subscription_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.id = subscription_items.subscription_id AND s.user_id = auth.uid()
  )
);

-- user_product_scores
CREATE POLICY "Users can access own user_product_scores"
ON user_product_scores FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

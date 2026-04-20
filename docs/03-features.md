# 功能模組與開發順序

> 依複雜度與依賴關係排序，按 Phase 順序與 Cursor 協作完成。
> 每個任務完成後在此打勾。

---

## 專案初始化（已完成）

- [x] Next.js 14 App Router + TypeScript + Tailwind CSS 初始化
- [x] 建立 `/docs/` 以外的完整資料夾結構（`/app`、`/components`、`/lib`、`/supabase/functions`、`/types`，實作於 `src/` 下）
- [x] `src/lib/supabase/server.ts` 與 `src/lib/supabase/client.ts` 建立完成
- [x] `middleware.ts` 同時保護 `/(main)` 對應路由與 `/admin` 路由群
- [x] `src/lib/calculations.ts` 包含 `calcBMI`、`calcBMR`、`calcTDEE`、`calcDailyCalTarget`、`calcTargetDate`、`calcRecommendScore`
- [x] `src/types/supabase.ts` 佔位檔案（註明需執行 `supabase gen types` 產生）
- [x] `.env.local.example` 包含 `01-stack.md` 所列環境變數
- [x] `02-schema.md` SQL 整理為 `supabase/migrations/001_init.sql`（含 RLS），migration 已在 Supabase 執行

---

## Phase 1：地基（Week 1–2）

### P1-1 Supabase 專案建立

- [x] 建立 Supabase 專案
- [x] 執行 `02-schema.md` 的所有 SQL（依序執行）
- [x] 啟用所有表的 RLS 並設定基本政策
- [x] 設定 Supabase Auth（Email + Magic Link）
- [x] 執行 `supabase gen types typescript` 產生型別

### P1-2 Next.js 基礎架構

- [x] Next.js 14 App Router + TypeScript + Tailwind CSS
- [x] 設定 `lib/supabase/server.ts` 和 `lib/supabase/client.ts`
- [x] 設定 middleware（保護 `/(main)` 與 `/admin` 路由）
- [x] 建立基礎 UI 元件：Button、Card、Badge、Input

### P1-3 Auth 流程

- [x] `/login` 頁面（Email + Magic Link）
- [x] Auth callback 處理（`/auth/callback`）
- [x] 登出功能
- [x] 未登入自動導向 `/login`

### P1-4 Onboarding 建檔流程（4 步驟 Wizard）

- [x] `/onboarding` 四步 Wizard，每步寫入 Supabase
- [x] 尚未完成建檔（`user_profiles.diet_method` 尚未設定）時，無法使用 `/(main)` 內頁面，會導向 `/onboarding`
- [x] 完成 Step 4 後觸發推薦分數重算（非同步，不阻塞導頁）

依序完成以下步驟，每步都要儲存到對應的 Supabase table：

**Step 1：基本資料**

- 欄位：姓名、性別、生日、活動量
- 寫入：`user_profiles`

**Step 2：身體數據**

- 欄位：身高、體重
- 自動計算並顯示：BMI、BMR、TDEE（用 `lib/calculations.ts`）
- 寫入：`user_profiles`（含計算結果）

**Step 3：飲食偏好 + 飲食法**

- 欄位：飲食習慣（omnivore/vegetarian/vegan）、飲食法（mediterranean/keto/high_protein/low_cal/intermittent/dash/custom）
- 忌食清單（標籤式多選輸入）
- 過敏原勾選（shellfish、peanuts、gluten、dairy、eggs、soy、tree_nuts）
- 顯示提示文案：`此設定用於商城的個人化推薦，日後可在設定中修改`（11px / `#9298A8`）
- 寫入：`user_profiles`（含 `diet_method`）

**Step 4：目標設定**

- 欄位：目標類型、目標體重、每週速率
- 自動計算：每日熱量目標、預計達標日
- 寫入：`user_goals`

Step 4 完成後：

- 寫入：`user_goals`
- 非同步呼叫：`POST /api/recalculate-scores`
- 直接導向：`/dashboard`（不等待推薦分數重算）

### P1-5 計算工具函數 `lib/calculations.ts`

```typescript
export function calcBMI(heightCm: number, weightKg: number): number;
// BMI = weightKg / (heightCm/100)²

export function calcBMR(
  gender: string,
  birthDate: Date,
  heightCm: number,
  weightKg: number,
): number;
// Mifflin-St Jeor 公式
// 男：10×weight + 6.25×height - 5×age + 5
// 女：10×weight + 6.25×height - 5×age - 161

export function calcTDEE(bmr: number, activityLevel: string): number;
// 活動係數：sedentary=1.2, light=1.375, moderate=1.55, active=1.725, very_active=1.9

export function calcDailyCalTarget(
  tdee: number,
  goalType: string,
  weeklyRateKg: number,
): number;
// lose_weight：tdee - (weeklyRateKg × 7700 / 7)
// gain_muscle：tdee + (weeklyRateKg × 7700 / 7)
// maintain：tdee

export function calcTargetDate(
  currentWeight: number,
  targetWeight: number,
  weeklyRate: number,
): Date;
// 相差公斤 / weeklyRate × 7 天

export function calcRecommendScore(
  product: Product,
  profile: UserProfile,
  goal: UserGoal,
): number;
// 見 05-shop.md 的完整邏輯
```

---

## Phase 2：核心功能（Week 3–5）

### P2-1 飲食記錄頁 `/log`（手動輸入 + AI 分析）

**搜尋記錄**：

- [x] 整合 Open Food Facts API（`https://world.openfoodfacts.org/cgi/search.pl`）
- [x] 自建食品快取（常用食物存入自己的 Supabase table）
- [x] 搜尋結果卡片 → 確認份量 → 寫入 `food_logs` + `food_log_items`

**拍照記錄**：

- [x] 上傳照片到 Supabase Storage（`food-photos` bucket）
- [x] 發到 AI Queue（Edge：`ai-photo-request` → QStash → `ai-photo-analyze`）
- [x] 分析完成後顯示食物列表讓用戶確認 → 寫入記錄

**每日記錄列表**：

- [x] 按餐次分組顯示今日記錄
- [x] 每筆可以刪除
- [x] 熱量加總顯示

### P2-2 拍照辨識

- [x] 上傳照片到 Supabase Storage（`food-photos` bucket）
- [x] 發到 AI Queue（Edge：`ai-photo-request` → QStash → `ai-photo-analyze`）
- [x] 分析完成後顯示食物列表讓用戶確認 → 寫入記錄

### P2-3 Dashboard

- [x] 問候語 + 今日日期 + 連續打卡 badge
- [x] 熱量圓環（今日攝取 / 目標，三大營養素進度條）
- [x] 體重卡（今日體重 + BMI）
- [x] 今日飲食摘要
- [x] AI 今日建議卡（直接呼叫，lazy load）
- [x] 快速操作列（記錄飲食、量體重）

### P2-4 體重快速輸入

- [x] Dashboard 的「記錄體重」快捷鍵
- [x] 寫入 `vital_logs.weight_kg`
- [x] 自動更新 `user_profiles.weight_kg`（觸發重算 BMI）

---

## Phase 3：分析與設定（Week 6–7）

### P3-1 數據分析頁 `/analytics`

- [x] 體重趨勢折線圖（Recharts LineChart）
- [x] 每日熱量長條圖（BarChart）
- [x] 營養素達成率雷達圖（RadarChart）
- [x] 週期切換（本週 / 本月 / 全程）
- [x] AI 週報洞察（每週日 cron 生成，頁面顯示最新一份）

### P3-2 個人設定頁 `/settings`

- [x] 個人資料編輯（姓名）
- [x] 身體數據更新（身高、體重 → 自動重算 BMI/BMR/TDEE）
- [x] 飲控目標修改（目標類型、目標體重 → 重算每日熱量）
- [x] 飲食偏好編輯（飲食法、忌食、過敏原）
  - ⚠️ 偏好改變時，觸發推薦分數重算（呼叫 Edge Function）
- [x] 帳號管理（登出、訂閱方案查看）

---

## Phase 4：健康商城（Week 8–10）

### P4-1 商品資料初始化

- [x] 建立測試品牌（migration `008_shop_seed_catalog.sql`，可改由 Studio 微調）
- [x] 建立測試商品（15 個，覆蓋不同 diet_tags）
- [x] 建立 ProductVariant（每個商品至少 1 個規格）
- [ ] 在 Stripe 建立對應的 Product + Price（一次性 + 訂閱），並回填 `product_variants.stripe_price_id`／`stripe_sub_price_id`

### P4-2 商城首頁 `/shop`

- [x] 個人化說明文字（顯示「為 {飲食法} 用戶過濾」）
- [x] 分類橫向切換（全部 / 堅果 / 蛋白棒 / 保健品 / 飲品 / 點心 / 代餐）
- [x] 篩選 Chips（符合飲食法 / 高蛋白 / 低糖 / 有機）
- [x] 商品卡格（推薦分數排序，即時用 `user_product_scores` 查）
- [x] 精選品牌卡列

### P4-3 商品詳情頁 `/shop/[productId]`

- [x] 商品圖 + 基本資訊 + 品牌標籤
- [x] 「為什麼適合你」區塊（用 `generateFitReasons()` 函數）
- [x] 規格選擇 + 數量選擇
- [x] 購買方式切換（單次 / 訂閱）
- [x] 訂閱頻率選擇（每週 / 每兩週 / 每月）
- [x] 加入購物車 / 立即訂閱按鈕
- [x] 完整營養標示表格
- [x] 成分與產地 + 認證標籤
- [x] 品牌故事卡 + 查看全系列

### P4-4 購物車 + 結帳（Stripe）

- [x] 購物車（Zustand 管理，不存 DB，結帳時才送出）
- [x] Stripe Checkout Session 建立（Edge Function）
- [x] 成功頁（Stripe redirect 後）
- [x] Stripe Webhook 接收（Edge Function `stripe-webhook`）
  - 實作以 `checkout.session.completed`（單次）→ 寫入 `orders` + `order_items`（見 `/docs/changes/2026-04-20-phase4-shop-stripe.md`）
  - `customer.subscription.created`／`updated` → 寫入／更新 `subscriptions` + `subscription_items`

### P4-5 訂閱管理

- [x] 個人設定內的「我的訂閱」區塊
- [x] 顯示訂閱商品、下次寄送日、金額
- [x] 暫停 / 取消訂閱（呼叫 Stripe API → Webhook 同步回 DB）
- [x] 修改頻率（同上）

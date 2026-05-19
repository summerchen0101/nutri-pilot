# 頁面規格（精簡 MVP 版）

> 每個頁面的元件區塊、資料查詢方式、互動邏輯。  
> UI 設計以現有的 HTML mockup 為視覺參考，功能以此文件為準。

---

## `/dashboard`（總覽）

### 元件區塊

| 區塊 | 資料來源 | 說明 |
|------|---------|------|
| Header | `user_profiles.name` | 問候語 + 今日日期 + 連續打卡 badge |
| 熱量圓環卡 | `food_log_items` 加總 | 今日攝取對 `user_goals.daily_cal_target` 顯示為「最高」；環色：未接近為綠、接近最高（約 ≥90% 且未超）為橘、超過為紅並滿環；進度條含碳水／蛋白質／脂肪及鈉（鈉以固定參考上線示意，無個別化上限欄） |
| 體重卡 | `vital_logs`（最新一筆） | 今日或最近體重 + BMI 計算值；**點擊**前往 `/log?date=今日&tab=body` 調整體重（與紀錄頁體重卡相同） |
| 今日餐食卡 | `food_logs` | 四餐記錄摘要（早中晚+點心），有未記錄的顯示提示 |
| AI 今日建議 | 伺服端自動：近 7 日紀錄（結束於 Taipei「今日」曆日）+ 對齊「飲食與脈絡」「健康與目標」；`dashboard_daily_insights` 以 Taipei **每日 04:00** 換線的「建議週期」為快取鍵（`insight_date`） | Suspense + `DashboardDailyInsightDeferred` → `DashboardInsightFab`：**Header 燈泡 icon**（AI 精靈左側），點擊開 `BottomSheetShell` 顯示建議全文（預載仍於 defer 完成）。新週期未讀（`localStorage`）或本次請求剛寫入快取（`justGenerated`）時 icon 右上角綠點；開啟抽層後標記已讀。同一週期僅產生／呼叫模型一次，其餘讀快取（見 `docs/04-ai-engine.md`） |

### 資料查詢（Server Component）

```typescript
// app/(main)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay } from 'date-fns'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = startOfDay(new Date())

  // 並行查詢
  const [
    { data: foodLogs },
    { data: vitalLog },
    { data: goal }
  ] = await Promise.all([
    // 今日飲食記錄
    supabase
      .from('food_logs')
      .select('*, items:food_log_items(*)')
      .eq('user_id', user!.id)
      .gte('date', today.toISOString().split('T')[0]),

    // 最新體重記錄
    supabase
      .from('vital_logs')
      .select('weight_kg, date')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .limit(1)
      .single(),

    // 用戶目標
    supabase
      .from('user_goals')
      .select('daily_cal_target, type, target_weight_kg')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .single()
  ])

  // 計算今日攝取熱量
  const todayCalories = foodLogs?.reduce((sum, log) =>
    sum + (log.items?.reduce((s, item) => s + item.calories, 0) ?? 0), 0) ?? 0

  return <DashboardUI {...{ todayCalories, vitalLog, foodLogs, goal }} />
}
```

---

## `/log`（每日紀錄：飲食 / 運動 / 體重與習慣）

### 元件區塊

| 區塊 | 說明 |
|------|------|
| 主分頁 | URL `?tab=food`（預設）/ `activity` / `body`（體重與習慣）；`?date=` 仍用於當日篩選 |
| 體重與習慣 | **`tab=body` 時顯示**，雙卡版面：**體重**（加／減步進並按「更新體重」寫入；無當日體重紀錄時可按「加」自 60 kg 起調。**身高**僅於設定編輯，不在此區）、**水分與睡眠**（飲水格、睡眠時數）。依 `?date=` 讀寫 `vital_logs`（`weight_kg`、`water_ml`、`sleep_hours`）。補登過去日期的體重僅寫入該日 `vital_logs`；今日體重在紀錄頁「體重」卡更新時會同步代謝與目標熱量（儀表板體重卡導向該頁）。飲水目標 ml 目前為固定常數（與儀表板一致） |
| 餐次 Tab | 僅在飲食分頁：早餐 / 午餐 / 晚餐 / 點心 |
| 輸入方式切換 | 手動（搜尋＋AI）/ 拍照餐點 |
| 搜尋輸入 | Open Food Facts 搜尋 + 結果列表 + 份量調整 + 加入 |
| 拍照餐點 | 上傳 `food-photos` → `ai-photo-request` → `ai-photo-analyze` → 確認營養卡 |
| 運動分頁 | 手寫入 `activity_logs`；當日列表、刪除；類型與分鐘、估熱與備註（選填） |
| 今日記錄列表 | 飲食分頁下依餐次分組，可刪除 |
| 熱量加總 | 僅 **飲食分頁**顯示：當日四餐總熱量 vs 目標；總熱量數字色與 Dashboard 圓環一致（≥90% 且未超為橘 `#EF9F27`、超過為紅 `#E24B4A`）；`/log/history` 列表摘要 kcal 同規則 |

---

## `/guard`（食品安全守衛 · 食品標示智慧分析）

獨立於紀錄頁：上傳至 `label-guard-photos` → `label-guard-request` → QStash → `label-guard-analyze`，結果寫入 `label_guard_jobs`，前端 Realtime／輪詢顯示安全分數、警示關鍵字（含食品添加物；點 chip 見條列常見成分說明，點 (i) 另見本次包裝摘錄）、族群建議、成分／添加物風險分級（同樣支援條列說明與 (i)）與 14 類過敏矩陣（陽性列可點 (i)，非醫療診斷）。底部導覽「守衛」進入；數據分析頁 `/analytics` 仍可由總覽等連結進入。結果卡可「儲存到個人紀錄」：預設名稱為 `YYYY-MM-DD 分數分`（可修改），每位使用者最多 5 筆；已滿 5 筆時以確認對話詢問是否覆蓋最舊紀錄（刪除 `created_at` 最久的一筆後儲存）。頁首右上角提供「食品安全分析紀錄」入口（icon）至 `/guard/records`。

## `/guard/records`（食品安全分析紀錄）

顯示當前使用者已儲存的 `label_guard_saved_reports`（依 `created_at desc`）。頁首下方顯示 **尚可紀錄數：n/5**（n 為已儲存筆數，上限與 DB `label_guard_saved_reports` 一致）。每筆顯示名稱、儲存時間與安全分數摘要；可修改名稱（底層表單）、可刪除（確認後）、可點入 **`/guard/records/[id]`** 檢視原圖（經 `job_id` → `label_guard_jobs.storage_path` 對 `label-guard-photos` 簽名 URL）與完整分析（與食品安全守衛頁共用 `LabelGuardReportBody`）。若無資料，顯示空狀態並引導回 `/guard` 建立第一筆。若 `job_id` 為空或無法簽名，仍顯示已儲存之 `report_json` 分析，僅缺原圖。

## 次級頁返回規則

除底部導覽主頁（`/dashboard`、`/log`、`/shop`、`/guard`、`/settings`）外，其餘次級頁頁首皆提供左箭頭返回，點擊行為為 `router.back()`。

### 搜尋食品邏輯

```typescript
// lib/food/search.ts
export async function searchFoods(query: string) {
  // 先查自建食品快取（台灣常見食物）
  const { data: cached } = await supabase
    .from('food_cache')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(5)

  if (cached && cached.length > 0) return cached

  // 再查 Open Food Facts
  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&lc=zh&cc=tw&page_size=10`
  )
  const data = await res.json()

  return data.products
    .filter((p: any) => p.nutriments?.energy_100g)
    .map((p: any) => ({
      name: p.product_name || p.product_name_zh || query,
      calories_per_100g: (p.nutriments.energy_100g ?? 0) / 4.184,
      carb_g_per_100g: p.nutriments.carbohydrates_100g ?? 0,
      protein_g_per_100g: p.nutriments.proteins_100g ?? 0,
      fat_g_per_100g: p.nutriments.fat_100g ?? 0,
    }))
}
```

### 拍照記錄流程

```typescript
// 1. 用戶拍照或選圖
// 2. 上傳到 Supabase Storage
async function uploadPhoto(file: File, userId: string) {
  const path = `${userId}/${Date.now()}.jpg`
  const { data } = await supabase.storage
    .from('food-photos')
    .upload(path, file, { contentType: 'image/jpeg' })
  return data?.path
}

// 3. 發到 AI Queue（回傳 jobId）
// 4. 前端監聽 job 完成（Realtime 或 polling）
// 5. 顯示 AI 辨識結果，讓用戶確認份量
// 6. 用戶確認後寫入 food_logs + food_log_items
```

---

## `/analytics`（數據分析）

非底部導覽主頁，由總覽等連結進入。頁首提供左箭頭返回（`router.back()`），與其他次級頁一致。

### 圖表規格

| 圖表 | 類型 | X 軸 | Y 軸 | 資料來源 |
|------|------|------|------|---------|
| 體重趨勢 | LineChart | 日期 | kg | `vital_logs.weight_kg` |
| 每日熱量 | BarChart | 日期 | kcal | `food_log_items` 每日加總 |
| 每日運動時間 | BarChart | 日期 | 分鐘 | `activity_logs.duration_minutes` 每日加總 |
| 每日估計消耗 | BarChart | 日期 | kcal | `activity_logs.calories_est` 每日加總（僅有填估熱之列） |
| 運動類型分布 | BarChart（橫向） | 分鐘 | 類型（中文標籤） | 區間內 `activity_logs` 依 `activity_type` 加總分鐘 |
| 營養素達成率 | RadarChart | 碳水/蛋白/脂肪 | % | 實際 vs 目標比例 |

### 週期切換

| 週期 | 日期範圍 |
|------|---------|
| 本週 | 最近 7 天 |
| 本月 | 最近 30 天 |
| 全程 | 從計畫開始日到今天 |

### AI 週報洞察顯示

```typescript
// 顯示最新一份週報（由 cron 每週日生成，存在 weekly_insights 表）
const { data: insight } = await supabase
  .from('weekly_insights')
  .select('insights, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

// insights 是 JSON 陣列：[{ type: 'positive'|'warning'|'info', text: string }]
```

### 分享週報卡

除平均熱量、體重摘要外，含最近 7 日滾動視窗之運動合計分鐘與估消耗摘要（資料來源 `activity_logs`）。

---

## `/settings`（個人設定；頁首標題「我的」）

頁首與個人抬頭卡以下，其餘設定依主題分為四個可摺疊區塊（標題列含一行摘要）；同一區塊內若有多張卡，以卡片小標（13px）區分，避免與大分類標題同級重複。

### 設定區塊

| 區塊 | 可編輯欄位 | 儲存觸發 |
|------|-----------|---------|
| 個人資料 | 姓名 | 更新 `user_profiles` |
| 身體數據 | 僅身高（底層彈窗「編輯身高」）；體重於 `/log` 體重卡 | Server Action `saveHeightCm`：依目前 `user_profiles.weight_kg` 重算 BMI/BMR/TDEE，並更新作用中 `user_goals.daily_cal_target`、`target_date`；**不寫入** `vital_logs` |
| 飲控目標 | 目標類型、目標體重、每週速率 | 重算每日熱量目標與達標日 |
| 飲食偏好 | 飲食法、每日餐次、忌食、過敏原 | 更新後觸發推薦分數重算 |
| 個人化健康／飲食脈絡（健康脈絡卡） | 口述草稿 → AI 整理預覽 → 確認後寫入 `user_profiles.personal_context_facets`（含糖分／血糖等注意可於口述說明，仍非醫療診斷）；不清存原文 | `POST /api/ai/personal-context/analyze`（計 AI 額度）、`confirm`、`clear` |
| 會員購物點 | 顯示 `user_profiles.shop_points_balance`；1 點 = 1 元折抵（條款另定） | 異動寫入 `user_shop_point_ledger`（後端／金流） |
| 帳號管理 | 點數紀錄（`/settings/points`）、商城設定 Bottom Sheet、會員方案頁（`/settings/membership`）、重置、登出、刪除 | 商城設定：`user_shipping_addresses` CRUD、`saveShopPersonalizeRecommendations`；預設收件同步 `user_profiles.shipping_*` |

### 次級頁

| 路由 | 說明 |
|------|------|
| `/settings/points` | 點數流水列表（`user_shop_point_ledger`） |
| `/settings/membership` | 會員方案（月繳／自動扣款文案；扣款串接另議） |

### 身體數據更新邏輯（身高）

設定頁僅調整身高；體重以 `user_profiles`（由紀錄頁體重卡同步）為準，`saveHeightCm` 讀取既有體重重算代謝與作用中目標後，更新 `height_cm`、`bmi`、`bmr`、`tdee`。（舊文件中的雙欄(height/weight)一併寫入範例已廢棄。）

### 偏好更新 → 觸發推薦分數重算

```typescript
async function updateDietPreferences(userId: string, prefs: DietPreferences) {
  await supabase.from('user_profiles').update(prefs).eq('user_id', userId)

  // 觸發分數重算（Edge Function）
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recalculate-scores`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  })
}
```

---

## `/shop` 和 `/shop/[productId]`

詳見 `05-shop.md`。

### `/shop/settings`（商城設定頁）

頂部顯示 `user_profiles.shop_points_balance` 與最早到期且尚未過期之點數批次摘要（RPC `get_shop_points_next_expiry`，資料來源 `user_shop_point_lots`）；下方為訂單、常用地址（開啟 `ShopSettingsSheet`）、點數紀錄、優惠券捷徑。

---

## Onboarding `/onboarding`（4 步驟）

### Wizard 步驟管理

```typescript
// 用 URL search params 管理步驟（支援瀏覽器上一步）
// /onboarding?step=1 → step=2 → ... → step=4
// 每步驟完成儲存後才允許進入下一步

const steps = ['基本資料', '身體數據', '飲食偏好', '目標設定']

// Step 4 完成後：
// 1. 非同步觸發推薦分數重算
// 2. 導向 /dashboard
```

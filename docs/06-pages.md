# 頁面規格（精簡 MVP 版）

> 每個頁面的元件區塊、資料查詢方式、互動邏輯。  
> UI 設計以現有的 HTML mockup 為視覺參考，功能以此文件為準。

---

## `/dashboard`（總覽）

### 元件區塊

| 區塊 | 資料來源 | 說明 |
|------|---------|------|
| Header | `user_profiles.name` | 問候語 + 今日日期 + 連續打卡 badge |
| 熱量圓環卡 | `food_log_items` 加總 | 今日攝取 / 目標，三大營養素進度條（carb/protein/fat） |
| 體重卡 | `vital_logs`（最新一筆） | 今日或最近體重 + BMI 計算值 |
| 今日餐食卡 | `daily_menus` → `meals` | 四餐打卡狀態（早中晚+點心），有未打卡的顯示提示 |
| AI 今日建議卡 | 直接呼叫 Claude | lazy load，主畫面 skeleton 先顯示 |
| 快速操作列 | — | 「記錄飲食」→ `/log`，「今日計畫」→ `/plan`，「量體重」→ 彈出輸入框 |

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
    { data: dailyMenu },
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

    // 今日菜單（含打卡狀態）
    supabase
      .from('daily_menus')
      .select('*, meals(id, type, is_checked_in, total_calories)')
      .eq('date', today.toISOString().split('T')[0])
      .eq('plan_id', /* active plan id */ '')
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

  return <DashboardUI {...{ todayCalories, vitalLog, dailyMenu, goal }} />
}
```

---

## `/plan`（飲食計畫）

### 元件區塊

| 區塊 | 說明 |
|------|------|
| 計畫進度卡 | 完成天數 / 總天數、打卡率進度條 |
| 7 日日期選擇器 | 橫向 pill，完成=綠色，今日=藍色，未來=灰色 |
| 熱量分配卡 | 四餐熱量長條 + 合計 + 是否達標 |
| 菜單列表 | 依餐次展示，每個 MealItem 可以「換食材」 |
| 菜單生成中 | `status === 'pending'` 或 `'generating'` 時顯示 Skeleton |

### 互動邏輯

**打卡**：
```typescript
async function checkIn(mealId: string) {
  await supabase
    .from('meals')
    .update({ is_checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('id', mealId)
  // 更新 daily_menus.completion_pct
}
```

**換食材**：
```typescript
// 直接呼叫（不走 Queue，等待 2–3 秒）
async function swapMealItem(item: MealItem) {
  setSwapping(true)
  const alternatives = await callClaudeJSON(buildSwapPrompt({
    originalFood: item.name,
    originalCalories: item.calories,
    originalNutrition: { carb_g: item.carb_g, protein_g: item.protein_g, fat_g: item.fat_g },
    dietMethod: activePlan.diet_method,
    avoidFoods: profile.avoid_foods
  }))
  setAlternatives(alternatives) // 顯示 3 個替代選項的 modal
  setSwapping(false)
}
```

**Realtime 監聽菜單生成**：
```typescript
useEffect(() => {
  if (menu?.status !== 'pending' && menu?.status !== 'generating') return

  const channel = supabase
    .channel('menu-ready')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'daily_menus',
      filter: `id=eq.${menu.id}`
    }, () => mutate()) // 觸發 SWR 重新拉
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [menu?.id, menu?.status])
```

---

## `/log`（飲食記錄）

### 元件區塊

| 區塊 | 說明 |
|------|------|
| 餐次 Tab | 早餐 / 午餐 / 晚餐 / 點心 |
| 輸入方式切換 | 搜尋輸入 / 拍照記錄 |
| 搜尋輸入 | Open Food Facts 搜尋 + 結果列表 + 份量調整 + 加入 |
| 拍照記錄 | 相機按鈕 → 上傳 → 生成中（Skeleton）→ 確認食物列表 → 加入 |
| 今日記錄列表 | 依餐次分組，每筆顯示熱量，可刪除 |
| 熱量加總 | 今日四餐總熱量 vs 目標 |

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

### 圖表規格

| 圖表 | 類型 | X 軸 | Y 軸 | 資料來源 |
|------|------|------|------|---------|
| 體重趨勢 | LineChart | 日期 | kg | `vital_logs.weight_kg` |
| 每日熱量 | BarChart | 日期 | kcal | `food_log_items` 每日加總 |
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

---

## `/settings`（個人設定）

### 設定區塊

| 區塊 | 可編輯欄位 | 儲存觸發 |
|------|-----------|---------|
| 個人資料 | 姓名 | 更新 `user_profiles` |
| 身體數據 | 身高、體重 | 更新 + 重算 BMI/BMR/TDEE，更新 `user_goals.daily_cal_target` |
| 飲控目標 | 目標類型、目標體重、每週速率 | 重算每日熱量目標與達標日 |
| 飲食偏好 | 飲食法、每日餐次、忌食、過敏原 | 更新後觸發推薦分數重算 |
| 帳號管理 | — | 登出、查看訂閱方案 |

### 身體數據更新邏輯

```typescript
// lib/settings/update-body.ts
export async function updateBodyMetrics(userId: string, data: {
  heightCm: number
  weightKg: number
}) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('gender, birth_date, activity_level')
    .eq('user_id', userId)
    .single()

  const bmi = calcBMI(data.heightCm, data.weightKg)
  const bmr = calcBMR(profile!.gender, new Date(profile!.birth_date), data.heightCm, data.weightKg)
  const tdee = calcTDEE(bmr, profile!.activity_level)

  const { data: goal } = await supabase
    .from('user_goals')
    .select('type, weekly_rate_kg')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  const dailyCalTarget = calcDailyCalTarget(tdee, goal!.type, goal!.weekly_rate_kg)

  // 並行更新兩張表
  await Promise.all([
    supabase.from('user_profiles').update({
      height_cm: data.heightCm,
      weight_kg: data.weightKg,
      bmi, bmr, tdee
    }).eq('user_id', userId),

    supabase.from('user_goals').update({
      daily_cal_target: dailyCalTarget
    }).eq('user_id', userId).eq('is_active', true)
  ])
}
```

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

---

## Onboarding `/onboarding`

### Wizard 步驟管理

```typescript
// 用 URL search params 管理步驟（支援瀏覽器上一步）
// /onboarding?step=1 → step=2 → ... → step=5
// 每步驟完成儲存後才允許進入下一步

const steps = ['基本資料', '身體數據', '飲食偏好', '目標設定', '飲食方式']

// Step 5 完成後：
// 1. 建立 diet_plans（含 start_date = today）
// 2. 發 AI 菜單生成 request（不等待結果）
// 3. 導向 /dashboard
```

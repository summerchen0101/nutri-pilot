# AI 引擎規格

> Claude API + Upstash QStash Queue 架構。  
> 開始實作任何 AI 功能前，先閱讀此文件決定「走 Queue」或「直接呼叫」。

---

## 模型與任務分類

| 任務 | 模型 | 方式 | 原因 |
|------|------|------|------|
| 菜單生成 | claude-sonnet-4-5 | **Queue** | 耗時 3–6 秒，用戶等不住 |
| 拍照辨識（餐桌食物） | claude-sonnet-4-5 | **Queue** | 圖片上傳 + Vision 處理，耗時不定 |
| 食品標示智慧分析（守衛） | claude-sonnet-4-5 | **Queue** | 獨立 `label-guard-photos` + `label_guard_jobs`；prompt 見 `supabase/functions/_shared/label-guard-report-prompt.ts`，輸出 `_kind: label_guard_report` |
| 週報洞察 | claude-sonnet-4-5 | **Queue（cron 觸發）** | 資料量大，每週日自動跑 |
| 換食材建議 | claude-sonnet-4-5 | 直接呼叫 | prompt 短，回應快（< 2 秒） |
| 今日 Dashboard 建議 | claude-sonnet-4-5 | 直接呼叫 | lazy load，不擋主畫面 |

---

## Claude API Wrapper

```typescript
// lib/ai/claude.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function callClaude(
  prompt: string,
  options?: { imageBase64?: string; imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp' }
): Promise<string> {
  const content: Anthropic.MessageParam['content'] = []

  if (options?.imageBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: options.imageMediaType ?? 'image/jpeg',
        data: options.imageBase64
      }
    })
  }

  content.push({ type: 'text', text: prompt })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content }]
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

// 只回傳 JSON 的版本（大多數 AI 任務用這個）
export async function callClaudeJSON<T>(
  prompt: string,
  options?: { imageBase64?: string; imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp' }
): Promise<T> {
  const fullPrompt = prompt + '\n\n只回傳 JSON，不加 markdown code block 或任何說明文字。'
  const text = await callClaude(fullPrompt, options)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim()) as T
  } catch {
    throw new Error(`Claude 回傳的不是有效 JSON：${text.slice(0, 200)}`)
  }
}
```

---

## Queue 架構（Upstash QStash）

### QStash Webhook 驗證

```typescript
// 所有接收 QStash callback 的 Edge Function 都要先驗證
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'

// 或在 Supabase Edge Function 中手動驗證
async function verifyQStashSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('upstash-signature')
  if (!signature) return false
  // 使用 QSTASH_CURRENT_SIGNING_KEY 驗證
  // 詳見 Upstash 官方文件
  return true
}
```

### 菜單生成完整流程

**Step 1：前端觸發（Next.js API Route，唯一保留的用途）**

```typescript
// app/api/ai/menu-request/route.ts
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { planId, date } = await req.json()

  // 1. 建立 pending 狀態的菜單記錄
  const { data: menu } = await supabase
    .from('daily_menus')
    .insert({ plan_id: planId, date, status: 'pending' })
    .select()
    .single()

  // 2. 發到 QStash
  await fetch(process.env.QSTASH_URL + '/v2/publish/' +
    process.env.EDGE_FUNCTIONS_URL + '/ai-menu-generate', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.QSTASH_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ menuId: menu.id, userId: user.id })
  })

  // 3. 立刻回應，前端監聽 Realtime
  return Response.json({ menuId: menu.id, status: 'pending' })
}
```

**Step 2：Edge Function Worker（QStash callback）**

```typescript
// supabase/functions/ai-menu-generate/index.ts
Deno.serve(async (req) => {
  // 驗證 QStash 簽名
  // 取得用戶資料、計畫資料
  // 組合 prompt
  // 呼叫 Claude
  // 解析 JSON 回應
  // 寫入 meals + meal_items
  // 更新 daily_menus.status = 'ready'
  // Supabase Realtime 會自動推給前端
})
```

---

## Prompt 設計

### 1. 菜單生成 Prompt

```typescript
// lib/ai/prompts/menu-generate.ts
export function buildMenuPrompt(params: {
  dietMethod: string
  dailyCalTarget: number
  carbPct: number
  proteinPct: number
  fatPct: number
  avoidFoods: string[]
  allergens: string[]
  mealFrequency: number
}): string {
  const dietMethodLabel: Record<string, string> = {
    mediterranean: '地中海飲食',
    keto: '生酮飲食',
    high_protein: '高蛋白飲食',
    low_cal: '低熱量飲食',
    intermittent: '間歇性斷食',
    dash: 'DASH 飲食',
    custom: '自訂飲食'
  }

  const meals = params.mealFrequency === 3
    ? '早餐、午餐、晚餐'
    : '早餐、午餐、晚餐、點心'

  return `
你是專業的台灣營養師，熟悉台灣在地食材與飲食習慣。

請為以下用戶生成今日菜單，以 JSON 格式回傳。

用戶資料：
- 飲食方式：${dietMethodLabel[params.dietMethod]}
- 每日熱量目標：${params.dailyCalTarget} kcal
- 巨量營養素比例：碳水 ${params.carbPct}%，蛋白質 ${params.proteinPct}%，脂肪 ${params.fatPct}%
- 忌食清單：${params.avoidFoods.length > 0 ? params.avoidFoods.join('、') : '無'}
- 過敏原：${params.allergens.length > 0 ? params.allergens.join('、') : '無'}
- 餐次：${params.mealFrequency} 餐（${meals}）

要求：
1. 使用台灣常見食材，食物名稱用繁體中文
2. 每道菜需包含：name, quantity_g, calories, carb_g, protein_g, fat_g
3. 絕對不能含忌食食材與過敏原
4. 符合${dietMethodLabel[params.dietMethod]}的飲食原則
5. 四捨五入到小數點第一位

回傳格式（JSON）：
{
  "meals": [
    {
      "type": "breakfast",
      "scheduled_at": "08:00",
      "items": [
        { "name": "燕麥粥", "quantity_g": 80, "calories": 290, "carb_g": 50, "protein_g": 10, "fat_g": 5 }
      ]
    }
  ],
  "total_calories": 1800
}
`
}
```

### 2. 換食材 Prompt

```typescript
export function buildSwapPrompt(params: {
  originalFood: string
  originalCalories: number
  originalNutrition: { carb_g: number; protein_g: number; fat_g: number }
  dietMethod: string
  avoidFoods: string[]
}): string {
  return `
原食材：${params.originalFood}（${params.originalCalories} kcal）
  碳水：${params.originalNutrition.carb_g}g，蛋白質：${params.originalNutrition.protein_g}g，脂肪：${params.originalNutrition.fat_g}g

飲食方式：${params.dietMethod}
忌食：${params.avoidFoods.join('、') || '無'}

請推薦 3 個台灣常見的替代食材，條件：
1. 熱量相近（±50 kcal 以內）
2. 符合飲食法原則
3. 排除忌食清單
4. 說明為何適合替換

回傳 JSON：
[
  {
    "name": "食材名稱",
    "quantity_g": 100,
    "calories": 300,
    "carb_g": 40,
    "protein_g": 15,
    "fat_g": 8,
    "reason": "替換原因（一句話）"
  }
]
`
}
```

### 3. 拍照辨識 Prompt

```typescript
export const PHOTO_ANALYZE_PROMPT = `
這是用戶拍攝的餐點照片。

請辨識照片中所有的食物，估算份量與營養成分。

要求：
1. 識別所有可見食物，台灣常見料理請使用台灣慣用名稱
2. 份量不確定時，給合理的中間值
3. 熱量估算包含烹調用油

回傳 JSON：
[
  {
    "name": "食物名稱",
    "quantity_g": 150,
    "calories": 350,
    "carb_g": 45,
    "protein_g": 20,
    "fat_g": 10
  }
]
`
```

### 4. 週報洞察 Prompt

```typescript
export function buildWeeklyInsightPrompt(weeklyStats: {
  avgCalories: number
  calorieTarget: number
  avgProtein: number
  proteinTarget: number
  weightChange: number
  checkInRate: number
  goalType: string
}): string {
  return `
以下是用戶本週的健康數據摘要：

- 平均每日攝取熱量：${weeklyStats.avgCalories} kcal（目標：${weeklyStats.calorieTarget} kcal）
- 平均蛋白質攝取：${weeklyStats.avgProtein}g（目標：${weeklyStats.proteinTarget}g）
- 本週體重變化：${weeklyStats.weightChange > 0 ? '+' : ''}${weeklyStats.weightChange} kg
- 菜單打卡率：${weeklyStats.checkInRate}%
- 用戶目標：${weeklyStats.goalType === 'lose_weight' ? '減重' : weeklyStats.goalType === 'gain_muscle' ? '增肌' : '維持'}

請提供 3–5 條具體洞察，語氣自然、不說教、用繁體中文。

回傳 JSON：
[
  {
    "type": "positive",
    "text": "洞察內容"
  }
]

type 只能是：positive（做得好）、warning（需改善）、info（補充資訊）
`
}
```

### 5. 今日 Dashboard 建議 Prompt

```typescript
export function buildDailyTipPrompt(params: {
  todayCaloriesConsumed: number
  calorieTarget: number
  checkInCount: number
  totalMeals: number
  recentWeightTrend: 'up' | 'down' | 'stable'
}): string {
  const remaining = params.calorieTarget - params.todayCaloriesConsumed
  const checkinStatus = `已打卡 ${params.checkInCount}/${params.totalMeals} 餐`

  return `
用戶今日狀況：
- 熱量：已攝取 ${params.todayCaloriesConsumed} kcal，剩餘額度 ${remaining} kcal
- 打卡進度：${checkinStatus}
- 近期體重趨勢：${params.recentWeightTrend === 'down' ? '下降' : params.recentWeightTrend === 'up' ? '上升' : '穩定'}

請給一條今日個人化建議（繁體中文，2–3 句，具體可執行，語氣友善不說教）。
直接回傳純文字，不要 JSON。
`
}
```

---

## 週報 cron 設定（Supabase pg_cron）

```sql
-- 每週日晚上 21:00 觸發週報洞察生成
SELECT cron.schedule(
  'weekly-insight-job',
  '0 21 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_functions_url') || '/ai-weekly-insight',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
```

---

## 錯誤處理原則

```typescript
// Queue Worker 的錯誤處理
try {
  const result = await callClaudeJSON(prompt)
  // 寫入 DB，更新 status = 'ready'
} catch (error) {
  // 更新 status = 'error'，前端顯示「生成失敗，請重試」
  await supabase
    .from('daily_menus')
    .update({ status: 'error' })
    .eq('id', menuId)
  
  // QStash 有自動重試機制，預設重試 3 次
  // 若要讓 QStash 重試，回傳非 2xx status code
  return new Response('Processing failed', { status: 500 })
}
```

---

## 成本估算參考

| 任務 | 估計 token | 估計成本/次 |
|------|-----------|------------|
| 菜單生成 | ~2,000 | ~$0.006 |
| 拍照辨識 | ~1,500 + 圖片 | ~$0.01 |
| 換食材 | ~800 | ~$0.002 |
| 週報洞察 | ~1,500 | ~$0.005 |
| 今日建議 | ~500 | ~$0.001 |

**菜單快取策略**：同一飲食法 + 類似目標的菜單，可以快取 24 小時重複使用，減少 API 呼叫。

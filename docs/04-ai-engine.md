# AI 引擎規格

> Claude API + Upstash QStash Queue 架構。  
> 開始實作任何 AI 功能前，先閱讀此文件決定「走 Queue」或「直接呼叫」。

---

## 模型與任務分類

| 任務 | 模型 | 方式 | 原因 |
|------|------|------|------|
| 拍照辨識（餐桌食物） | claude-sonnet-4-5 | **Queue** | 圖片上傳 + Vision 處理，耗時不定 |
| 食品標示守衛 | claude-sonnet-4-5 | **Queue** | 獨立 `label-guard-photos` + `label_guard_jobs`；prompt 見 `supabase/functions/_shared/label-guard-report-prompt.ts` |
| 週報洞察 | claude-sonnet-4-5 | **Queue（cron 觸發）** | 資料量大，每週自動跑 |
| 今日 Dashboard 建議（個人化補充） | claude-sonnet-4-5 | 直接呼叫 | 僅在使用者已儲存 `personal_context_facets` 時 client 呼叫 `/api/ai/dashboard-insight`，與規則 bullet 合併 |
| 個人化口述整理 | claude-sonnet-4-5 | 直接呼叫 | 設定頁 `POST /api/ai/personal-context/analyze`；確認套用不呼叫模型 |

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

### Queue Worker 共通流程

使用者或 cron 觸發 → Edge Function 建立 `*_jobs` 列為 `pending` → QStash 呼叫 Worker → Claude → 更新 `status` 與結果 JSON → 前端以輪詢或 Realtime 更新 UI。

---

## Prompt 設計

### 1. 拍照辨識 Prompt

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

### 2. 週報洞察 Prompt

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
- 本週飲食紀錄完成度：${weeklyStats.checkInRate}%
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

### 3. 今日 Dashboard 建議 Prompt

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
// Queue Worker 的錯誤處理（例：photo_analysis_jobs）
try {
  const result = await callClaudeJSON(prompt)
  // 寫入 DB，更新 status = 'ready'
} catch (error) {
  await supabase
    .from('photo_analysis_jobs')
    .update({ status: 'error', error_message: String(error) })
    .eq('id', jobId)

  return new Response('Processing failed', { status: 500 })
}
```

---

## 成本估算參考

| 任務 | 估計 token | 估計成本/次 |
|------|-----------|------------|
| 拍照辨識 | ~1,500 + 圖片 | ~$0.01 |
| 標示守衛 | ~1,500 + 圖片 | ~$0.01 |
| 週報洞察 | ~1,500 | ~$0.005 |
| 今日建議 | ~500 | ~$0.001 |

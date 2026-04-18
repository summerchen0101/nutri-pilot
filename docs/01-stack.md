# 技術選型與架構

> 每次新增功能前確認這份文件，避免用錯工具或在錯誤層實作邏輯。

---

## 技術選型總覽

```
前端         Next.js 14 (App Router) + TypeScript + Tailwind CSS
後端         Supabase Edge Functions（取代 Next.js API Routes）
資料庫       Supabase PostgreSQL（直接用 Supabase client + SQL，不用 Prisma）
Auth         Supabase Auth（Email + Magic Link）
Storage      Supabase Storage（用戶上傳照片）
AI           Anthropic Claude API（claude-sonnet-4-5）
AI Queue     Upstash QStash（重型 AI 任務非同步處理）
狀態管理      Zustand
資料同步      SWR
圖表         Recharts
金流         Stripe（一次性購買 + Stripe Billing 訂閱）
部署         Vercel（前端）+ Supabase（後端）
```

---

## 關鍵架構決策與原因

### ❌ 不用 Prisma，直接用 Supabase client

**原因**：
- Supabase Edge Function 的 Deno 環境，Prisma 需要額外 binary，部署麻煩
- Supabase 本身就是 query layer，Prisma 是重複維護成本
- `supabase gen types typescript` 產出的型別已足夠 type-safe

**正確做法**：
```typescript
// ✅ 正確：直接用 supabase client
const { data, error } = await supabase
  .from('food_logs')
  .select('*, items(*)')
  .eq('user_id', userId)
  .gte('date', today.toISOString())

// ❌ 錯誤：不要引入 Prisma
import { db } from '@/lib/db' // 不存在這個
```

**型別生成**：
```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

---

### ❌ 不用 Next.js API Routes 當主要後端

**唯一例外**：Next.js API Routes 只保留一個用途——前端發起 AI Queue 請求的入口（因為需要讀 session）。

**所有其他後端邏輯**都在 Supabase Edge Functions：
- CRUD 操作
- 金流 Webhook 驗簽
- cron 排程
- 通知觸發

**原因**：
- Next.js API 有 Vercel 的 timeout 限制（Hobby: 10s，Pro: 60s）
- Webhook 重試機制需要穩定端點，Edge Function 靠近 DB 更穩
- AI Queue callback 必須由 Upstash 打 Edge Function，不能打 Vercel

---

### 🔥 AI Queue 架構（最重要，不能跳過）

**必須走 Queue 的任務**（耗時 > 3 秒）：
- 菜單生成 `/functions/ai-menu-generate`
- 拍照辨識 `/functions/ai-photo-analyze`
- 週報洞察 `/functions/ai-weekly-insight`

**可以直接呼叫的任務**（耗時 < 2 秒）：
- 換食材建議
- 今日 Dashboard 建議

**Queue 流程**：
```
前端發請求
    ↓
Edge Function 接收 → 立刻寫 status: 'pending' 到 DB → 回 202
    ↓
發布任務到 Upstash QStash
    ↓
QStash callback 打 Worker Edge Function
    ↓
Worker 呼叫 Claude API
    ↓
結果寫入 DB（status: 'ready'）
    ↓
Supabase Realtime 自動推給前端
    ↓
前端更新 UI
```

**前端等待模式**：
```typescript
// SWR polling + Supabase Realtime 雙保險
useEffect(() => {
  const channel = supabase
    .channel('menu-status')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'daily_menus',
      filter: `id=eq.${menuId}`
    }, (payload) => {
      if (payload.new.status === 'ready') {
        mutate() // 觸發 SWR 重新拉資料
      }
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [menuId])
```

---

## 資料夾結構

```
/app
  /(auth)
    /login
    /onboarding          ← 建檔期 5 步驟 Wizard
  /(main)
    /dashboard           ← 總覽
    /plan                ← 飲食計畫
    /log                 ← 飲食記錄
    /analytics           ← 數據分析
    /shop                ← 健康商城
      /[productId]       ← 商品詳情
    /settings            ← 個人設定

/components
  /ui                    ← Button, Card, Badge 等基礎元件
  /charts                ← Recharts 封裝元件
  /shop                  ← 商城專用元件

/lib
  /ai                    ← Claude API wrapper + prompt 函數
  /calculations          ← BMI, BMR, TDEE 計算
  /supabase              ← client 初始化（server/client 兩份）

/supabase
  /functions             ← 所有 Edge Functions
    /ai-menu-generate    ← AI 菜單 Queue Worker
    /ai-photo-analyze    ← 拍照辨識 Queue Worker
    /ai-weekly-insight   ← 週報 cron Worker
    /stripe-webhook      ← Stripe 金流 Webhook

/types
  supabase.ts            ← 自動產生，不要手動改
  index.ts               ← 自訂型別
```

---

## Supabase Client 初始化（兩份）

```typescript
// lib/supabase/server.ts（Server Components, Edge Functions）
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookies) => { cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } } }
  )
}
```

```typescript
// lib/supabase/client.ts（Client Components）
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## 環境變數清單

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 只在 Edge Functions 用，不暴露前端

# Anthropic
ANTHROPIC_API_KEY=

# Upstash QStash
QSTASH_URL=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=     # 驗證 QStash callback 合法性
QSTASH_NEXT_SIGNING_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## 部署架構

```
用戶瀏覽器
    ↓ HTTPS
Vercel（Next.js 前端）
    ↓ Supabase client（anon key）
Supabase（DB + Auth + Storage + Edge Functions）
    ↓ 重型 AI 任務
Upstash QStash → Supabase Edge Function Worker → Claude API
    ↓ 金流
Stripe → Supabase Edge Function Webhook
```

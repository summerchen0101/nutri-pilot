# API 端點清單

> 精簡版：移除了語音、條碼、PDF 匯出、裝置整合相關端點。  
> 絕大多數後端邏輯在 Supabase Edge Functions，Next.js API Routes 只保留一個。

---

## 架構說明

```
前端（Next.js）
  └── 讀取資料：直接用 Supabase client（anon key + RLS 保護）
  └── 寫入一般資料：直接用 Supabase client
  └── AI 任務觸發：Next.js API Route → Upstash QStash
  └── 金流操作：Supabase Edge Function

Supabase Edge Functions（後端邏輯）
  └── AI Worker（QStash callback）
  └── Stripe Checkout 建立
  └── Stripe Webhook 處理
  └── 推薦分數重算
  └── 週報 cron（pg_cron 觸發）
```

---

## Next.js API Routes（僅此一個）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/ai/menu-request` | 觸發 AI 菜單生成（驗 session → 發到 QStash） |

```typescript
// app/api/ai/menu-request/route.ts
// 這是唯一保留的 Next.js API Route
// 原因：需要存取 Next.js session cookie 取得 user_id
// 之後發布到 QStash → Edge Function Worker 處理
```

---

## Supabase Edge Functions

### AI 相關

| Function 名稱 | 觸發方式 | 說明 |
|--------------|---------|------|
| `ai-menu-generate` | QStash callback | 呼叫 Claude 生成菜單，寫入 DB |
| `ai-photo-analyze` | QStash callback | Claude Vision 分析照片，回傳食物列表 |
| `ai-weekly-insight` | pg_cron（每週日 21:00）| 生成週報洞察，寫入 `weekly_insights` |

**`ai-menu-generate` 輸入格式**：
```json
{
  "menuId": "uuid",
  "userId": "uuid"
}
```

**`ai-menu-generate` 輸出**（寫入 DB）：
- 更新 `daily_menus.status` = `'ready'`
- 寫入 `meals`（4 筆）
- 寫入 `meal_items`（每餐 3–5 筆）

**`ai-photo-analyze` 輸入格式**：
```json
{
  "jobId": "uuid",
  "userId": "uuid",
  "storagePath": "user-id/timestamp.jpg"
}
```

**`ai-photo-analyze` 輸出**（寫入 DB）：
- 更新 `photo_analysis_jobs.status` = `'ready'`
- 寫入 `photo_analysis_jobs.result`（JSON 食物陣列）

---

### 金流相關

| Function 名稱 | 觸發方式 | 說明 |
|--------------|---------|------|
| `create-checkout` | 前端直接呼叫 | 建立 Stripe Checkout Session |
| `stripe-webhook` | Stripe 打過來 | 處理付款成功、訂閱更新等事件 |
| `manage-subscription` | 前端直接呼叫 | 暫停 / 取消 / 修改訂閱頻率 |

**`create-checkout` 輸入格式**：
```json
{
  "items": [
    { "variantId": "uuid", "quantity": 2 }
  ],
  "mode": "payment",
  "frequency": "monthly"
}
```

**`create-checkout` 輸出**：
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**`stripe-webhook` 處理的事件**：
- `checkout.session.completed` → 寫訂單
- `customer.subscription.created` → 寫訂閱
- `customer.subscription.updated` → 更新訂閱狀態
- `customer.subscription.deleted` → 標記訂閱取消

**`manage-subscription` 輸入格式**：
```json
{
  "subscriptionId": "uuid",
  "action": "pause" | "cancel" | "update_frequency",
  "frequency": "weekly" | "biweekly" | "monthly"
}
```

---

### 其他 Edge Functions

| Function 名稱 | 觸發方式 | 說明 |
|--------------|---------|------|
| `recalculate-scores` | 用戶更新偏好時呼叫 | 重算該用戶所有商品的推薦分數 |

**`recalculate-scores` 輸入格式**：
```json
{
  "userId": "uuid"
}
```

---

## 直接用 Supabase client 的操作（不需 Edge Function）

以下操作直接在前端或 Server Component 用 Supabase client 完成：

### 用戶資料
```typescript
// 取個人資料
supabase.from('user_profiles').select('*').eq('user_id', userId).single()

// 更新個人資料（非敏感，RLS 保護即可）
supabase.from('user_profiles').update(data).eq('user_id', userId)

// 更新目標
supabase.from('user_goals').update(data).eq('user_id', userId).eq('is_active', true)
```

### 飲食計畫
```typescript
// 取進行中計畫
supabase.from('diet_plans').select('*').eq('user_id', userId).eq('is_active', true).single()

// 取指定日菜單（含餐次和食材）
supabase.from('daily_menus')
  .select('*, meals(*, items:meal_items(*))')
  .eq('date', date)
  .eq('plan_id', planId)
  .single()

// 打卡
supabase.from('meals')
  .update({ is_checked_in: true, checked_in_at: new Date().toISOString() })
  .eq('id', mealId)
```

### 飲食記錄
```typescript
// 取指定日記錄
supabase.from('food_logs')
  .select('*, items:food_log_items(*)')
  .eq('user_id', userId)
  .eq('date', date)

// 新增記錄
const { data: log } = await supabase.from('food_logs').insert({
  user_id: userId, date, meal_type: 'lunch', method: 'search'
}).select().single()

await supabase.from('food_log_items').insert(
  items.map(item => ({ log_id: log.id, ...item }))
)

// 刪除記錄
supabase.from('food_log_items').delete().eq('id', itemId)
```

### 數據記錄
```typescript
// 體重記錄（upsert，一天只有一筆）
supabase.from('vital_logs').upsert({
  user_id: userId,
  date: today,
  weight_kg: weightKg
}, { onConflict: 'user_id,date' })

// 取體重趨勢（最近 30 天）
supabase.from('vital_logs')
  .select('date, weight_kg')
  .eq('user_id', userId)
  .gte('date', thirtyDaysAgo)
  .order('date', { ascending: true })
```

### 商城
```typescript
// 取商品（含推薦分數排序）
supabase.from('user_product_scores')
  .select('score, product:products(*, variants:product_variants(*), brand:brands(name))')
  .eq('user_id', userId)
  .gt('score', 0)
  .order('score', { ascending: false })

// 取商品詳情
supabase.from('products')
  .select('*, variants:product_variants(*), brand:brands(*)')
  .eq('id', productId)
  .single()

// 取用戶訂閱
supabase.from('subscriptions')
  .select('*, items:subscription_items(*, variant:product_variants(*, product:products(*)))')
  .eq('user_id', userId)
  .eq('status', 'active')
```

---

## Supabase Storage Bucket 設定

| Bucket 名稱 | 存取權限 | 用途 |
|------------|---------|------|
| `food-photos` | 私有（只有 owner 可存取） | 用戶拍照上傳的餐點照片 |

```sql
-- Storage 政策：只有上傳者本人可以存取
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can access own photos"
ON storage.objects FOR SELECT
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 錯誤碼規範

| HTTP 狀態碼 | 使用情境 |
|------------|---------|
| 200 | 成功 |
| 202 | AI 任務已接受，正在處理（Queue 模式） |
| 400 | 請求格式錯誤 |
| 401 | 未登入或 token 失效 |
| 403 | 已登入但無權限（操作別人的資料） |
| 404 | 找不到資源 |
| 422 | 資料驗證失敗 |
| 500 | 伺服器錯誤（Edge Function 內部錯誤） |

---

## Webhook 端點安全

**Stripe Webhook**（必須驗簽）：
```typescript
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
// 驗失敗 → 回 400，不執行任何 DB 操作
```

**QStash Callback**（必須驗簽）：
```typescript
// 使用 QSTASH_CURRENT_SIGNING_KEY 驗證
// 驗失敗 → 回 401，QStash 會自動重試
```

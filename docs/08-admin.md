# 主後台規格

> 路徑：`/admin/*`  
> 同一個 Next.js 專案，獨立路由群。  
> 廠商不登入，所有商品由內部管理。  
> MVP 階段超管一人用，架構預留多角色擴充。

---

## 路由結構

```
/admin
  /dashboard          ← BI 儀表板（GMV、訂單、用戶、商品轉換）
  /products           ← 商品列表
    /new              ← 新增商品
    /[id]             ← 編輯商品
  /brands             ← 品牌列表 + 編輯
    /new
    /[id]
  /orders             ← 訂單管理
    /[id]             ← 訂單詳情 + 出貨更新
  /subscriptions      ← 訂閱管理
  /users              ← 用戶列表（唯讀為主）
    /[id]             ← 用戶詳情 + 訂單紀錄
  /settings           ← 後台設定（角色管理，Phase 後期）
```

---

## 角色設計

### 三個角色

| 角色 | 識別值 | 說明 |
|------|--------|------|
| 超級管理員 | `super_admin` | 所有功能，包含財務數據、刪除、角色管理 |
| 編輯 | `editor` | 商品 / 品牌管理，可看商品數據，不能看用戶個資與財務 |
| 客服 | `cs` | 訂單查詢與出貨更新，可看用戶基本資料，不能看財務 |

### 各模組權限對照

| 模組 | super_admin | editor | cs |
|------|:-----------:|:------:|:--:|
| BI 儀表板（完整）| ✓ | — | — |
| BI 儀表板（商品數據）| ✓ | ✓ | — |
| 新增 / 編輯商品 | ✓ | ✓ | — |
| 刪除 / 下架商品 | ✓ | — | — |
| 品牌管理 | ✓ | ✓ | — |
| 訂單列表 + 詳情 | ✓ | — | ✓ |
| 更新出貨狀態 | ✓ | — | ✓ |
| 退款操作 | ✓ | — | — |
| 用戶列表（基本資料）| ✓ | — | ✓（唯讀）|
| 停用用戶帳號 | ✓ | — | — |
| 角色管理 | ✓ | — | — |

---

## 角色存取方式

角色存在 Supabase Auth 的 `app_metadata`，只有 `service_role` key 能寫，用戶無法自行修改。

### 設定角色（Edge Function）

```typescript
// supabase/functions/set-admin-role/index.ts
// 只有已是 super_admin 的人才能呼叫

Deno.serve(async (req) => {
  const { targetUserId, role } = await req.json()

  // 驗證呼叫者是 super_admin
  const caller = await getCallerFromJWT(req)
  if (caller?.app_metadata?.admin_role !== 'super_admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
    app_metadata: { admin_role: role } // 'super_admin' | 'editor' | 'cs' | null
  })

  return Response.json({ ok: true })
})
```

### Middleware 保護路由

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_ACCESS: Record<string, string[]> = {
  '/admin/dashboard':     ['super_admin', 'editor'],
  '/admin/products':      ['super_admin', 'editor'],
  '/admin/brands':        ['super_admin', 'editor'],
  '/admin/orders':        ['super_admin', 'cs'],
  '/admin/subscriptions': ['super_admin', 'cs'],
  '/admin/users':         ['super_admin', 'cs'],
  '/admin/settings':      ['super_admin'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const supabase = createServerClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser()

  // 未登入
  if (!user) return NextResponse.redirect(new URL('/admin/login', request.url))

  const role = user.app_metadata?.admin_role as string | undefined

  // 沒有後台角色
  if (!role) return NextResponse.redirect(new URL('/admin/login', request.url))

  // 檢查此路徑的角色權限
  const matchedPath = Object.keys(ROLE_ACCESS).find(p => pathname.startsWith(p))
  if (matchedPath && !ROLE_ACCESS[matchedPath].includes(role)) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
```

### 在 Server Component 取得角色

```typescript
// lib/admin/get-role.ts
import { createClient } from '@/lib/supabase/server'

export type AdminRole = 'super_admin' | 'editor' | 'cs'

export async function getAdminRole(): Promise<AdminRole | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (user?.app_metadata?.admin_role as AdminRole) ?? null
}

// 在需要細粒度控制的 Server Component 使用
export function can(role: AdminRole, action: string): boolean {
  const permissions: Record<string, AdminRole[]> = {
    'product.delete':    ['super_admin'],
    'order.refund':      ['super_admin'],
    'user.suspend':      ['super_admin'],
    'analytics.finance': ['super_admin'],
    'product.edit':      ['super_admin', 'editor'],
    'order.ship':        ['super_admin', 'cs'],
  }
  return permissions[action]?.includes(role) ?? false
}
```

---

## DB 補充：後台需要的額外資料表

```sql
-- 商品事件追蹤（BI 漏斗用）
CREATE TABLE product_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression',   -- 出現在推薦列表中
    'click',        -- 點進商品詳情
    'add_to_cart',  -- 加入購物車
    'purchase'      -- 完成購買
  )),
  source     TEXT,  -- 'recommendation' | 'search' | 'brand_page'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 不需要 RLS（後台直接用 service role 查）
-- 前端埋點用 anon key 寫入即可，不含敏感資料

-- 週報洞察（Analytics 頁面顯示用，ai-engine 文件中已提到）
CREATE TABLE weekly_insights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insights   JSONB NOT NULL,  -- [{ type, text }]
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- 後台操作紀錄（角色管理做好後啟用）
CREATE TABLE admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES auth.users(id),
  action      TEXT NOT NULL,   -- 'product.create' | 'order.refund' | ...
  target_type TEXT,            -- 'product' | 'order' | 'user'
  target_id   TEXT,
  metadata    JSONB,           -- 變更前後的 diff
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 前端埋點設計

在關鍵用戶行為處埋事件，寫入 `product_events`：

```typescript
// lib/analytics/track.ts
import { createClient } from '@/lib/supabase/client'

export async function trackEvent(
  productId: string,
  eventType: 'impression' | 'click' | 'add_to_cart' | 'purchase',
  source?: string
) {
  const supabase = createClient()
  // fire-and-forget，不 await，不擋 UI
  supabase.from('product_events').insert({
    product_id: productId,
    event_type: eventType,
    source
  }).then() // 靜默失敗，不影響用戶體驗
}
```

**埋點位置**：

```typescript
// 1. 商城列表：商品卡進入 viewport（用 IntersectionObserver）
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        trackEvent(productId, 'impression', 'recommendation')
        observer.unobserve(e.target)  // 只算一次
      }
    })
  }, { threshold: 0.5 })
  observer.observe(cardRef.current!)
  return () => observer.disconnect()
}, [])

// 2. 點進商品詳情頁
// app/(main)/shop/[productId]/page.tsx — Server Component 進入時
await trackEvent(productId, 'click', searchParams.source ?? 'recommendation')

// 3. 加入購物車
function addToCart(variantId: string) {
  cartStore.add(variantId, quantity)
  trackEvent(productId, 'add_to_cart')
}

// 4. 購買完成（在 Stripe Webhook Edge Function 裡記錄）
// stripe-webhook → checkout.session.completed → 寫 order_items 同時寫 product_events
```

---

## BI 儀表板

### `/admin/dashboard` 頁面區塊

| 區塊 | 角色 | 說明 |
|------|------|------|
| 核心指標卡 | super_admin | 本月 GMV、訂單數、訂閱數、活躍用戶數 |
| 銷售趨勢圖 | super_admin | 過去 30 天每日 GMV（LineChart） |
| 用戶行為摘要 | super_admin | 日均打卡率、菜單完成率、平均記錄天數 |
| 商品轉換漏斗 | super_admin + editor | 曝光→點擊→加購→購買（各階段數字 + 轉換率）|
| 熱門商品 Top 10 | super_admin + editor | 依購買數排序 |
| 訂閱概況 | super_admin | 活躍訂閱數、本月新增、本月取消、MRR |

### 核心指標查詢

```typescript
// lib/admin/analytics.ts（在 Server Component 呼叫）

// 本月 GMV
const { data: gmv } = await supabase
  .from('orders')
  .select('total')
  .eq('status', 'paid')
  .gte('created_at', startOfMonth.toISOString())

const monthlyGMV = gmv?.reduce((sum, o) => sum + o.total, 0) ?? 0

// 過去 30 天每日 GMV（SQL 聚合）
const { data: dailyGMV } = await supabase.rpc('get_daily_gmv', {
  days: 30
})

// 對應的 Postgres function
/*
CREATE OR REPLACE FUNCTION get_daily_gmv(days INT)
RETURNS TABLE(date DATE, gmv NUMERIC) AS $$
  SELECT
    DATE(created_at) AS date,
    SUM(total)       AS gmv
  FROM orders
  WHERE status = 'paid'
    AND created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date ASC
$$ LANGUAGE sql SECURITY DEFINER;
*/

// 活躍用戶數（過去 7 天有打卡或記錄飲食的用戶）
const { count: activeUsers } = await supabase
  .from('food_logs')
  .select('user_id', { count: 'exact', head: true })
  .gte('logged_at', sevenDaysAgo.toISOString())

// 訂閱 MRR（每月經常性收入）
const { data: subs } = await supabase
  .from('subscriptions')
  .select('frequency, items:subscription_items(variant:product_variants(sub_price, qty:subscription_items(qty)))')
  .eq('status', 'active')

// MRR 計算：weekly × 4.33 + biweekly × 2.17 + monthly × 1
```

### 商品轉換漏斗查詢

```typescript
// 各事件類型的數量（指定時間範圍）
const { data: funnel } = await supabase.rpc('get_product_funnel', {
  product_id: productId,  // null = 全部商品
  start_date: thirtyDaysAgo,
  end_date: today
})

/*
CREATE OR REPLACE FUNCTION get_product_funnel(
  product_id UUID,
  start_date DATE,
  end_date DATE
)
RETURNS TABLE(event_type TEXT, count BIGINT) AS $$
  SELECT event_type, COUNT(*) as count
  FROM product_events
  WHERE
    (product_id IS NULL OR product_events.product_id = get_product_funnel.product_id)
    AND created_at::DATE BETWEEN start_date AND end_date
  GROUP BY event_type
  ORDER BY ARRAY_POSITION(
    ARRAY['impression','click','add_to_cart','purchase'],
    event_type
  )
$$ LANGUAGE sql SECURITY DEFINER;
*/
```

---

## 商品管理

### `/admin/products` 列表頁

```typescript
// 查詢（含品牌名、規格數、總庫存）
const { data: products } = await supabase
  .from('products')
  .select(`
    id, name, category, is_active, avg_rating, created_at,
    brand:brands(name),
    variants:product_variants(id, price, stock)
  `)
  .order('created_at', { ascending: false })

// 欄位：商品名、品牌、分類、規格數、最低價格、總庫存、狀態、操作
```

### `/admin/products/[id]` 編輯頁表單欄位

**基本資訊**
- 商品名稱（必填）
- 品牌（下拉選單，從 brands 表）
- 分類（下拉）
- 商品描述
- 商品圖片（上傳到 Supabase Storage `product-images` bucket）

**營養標示**（必填，影響推薦邏輯）
- 每份重量（g）
- 熱量（kcal）
- 碳水（g）、蛋白質（g）、脂肪（g）
- 纖維（g）、糖（g）、鈉（mg）（選填）

**推薦引擎標籤**（核心，不能跳過）
- 飲食法標籤 `diet_tags`：多選 checkbox
  - `mediterranean` / `keto` / `high_protein` / `low_cal` / `intermittent` / `dash`
- 認證標籤 `cert_tags`：多選
  - `organic` / `non_gmo` / `iso22000` / `gluten_free`
- 不含過敏原 `allergen_free`：多選
  - `peanut` / `shellfish` / `gluten` / `dairy` / `eggs` / `soy` / `tree_nuts`

**成分與產地**
- 成分列表（純文字）
- 產地

**規格管理**（ProductVariant，一對多）

每個規格欄位：
- 規格名稱（如「35g 隨手包」）
- 重量（g）
- 售價
- 訂閱價（選填）
- 庫存數量
- Stripe Price ID（一次性）
- Stripe Price ID（訂閱用）

```typescript
// 儲存邏輯（transaction-like：先存商品再存規格）
async function saveProduct(formData: ProductFormData) {
  // 1. upsert 商品
  const { data: product } = await supabase
    .from('products')
    .upsert(omit(formData, ['variants']))
    .select()
    .single()

  // 2. 刪除舊規格，重新插入（簡單粗暴，適合 MVP）
  await supabase.from('product_variants').delete().eq('product_id', product.id)
  await supabase.from('product_variants').insert(
    formData.variants.map(v => ({ ...v, product_id: product.id }))
  )

  // 3. 觸發所有用戶的推薦分數重算（新商品上架）
  await fetch(`${process.env.SUPABASE_FUNCTIONS_URL}/recalculate-scores`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ productId: product.id }) // 只算這個新商品
  })
}
```

---

## 訂單管理

### `/admin/orders` 列表頁

```typescript
const { data: orders } = await supabase
  .from('orders')
  .select(`
    id, status, total, created_at,
    user:users(email),
    items:order_items(
      qty, unit_price,
      variant:product_variants(label, product:products(name))
    )
  `)
  .order('created_at', { ascending: false })
```

欄位：訂單編號（Stripe PI ID 前 8 碼）、用戶 Email、商品摘要、金額、狀態、建立時間、操作

### 出貨狀態更新

```typescript
// 狀態流：pending → paid → shipped → delivered
// 只有 shipped 這步需要手動操作（其他由 Stripe Webhook 自動更新）

async function updateShipStatus(orderId: string, status: 'shipped' | 'delivered') {
  await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
  // 未來可在這裡加：發 Email 通知用戶（用 Resend）
}
```

### 退款（呼叫 Stripe）

```typescript
// 只有 super_admin 可執行
async function refundOrder(orderId: string, amount?: number) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/refund-order`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId, amount }) // amount 為 null 時全額退
    }
  )
}

// Edge Function：refund-order
// 1. 驗證呼叫者是 super_admin
// 2. 查 orders.id（就是 Stripe Payment Intent ID）
// 3. stripe.refunds.create({ payment_intent: orderId, amount })
// 4. 更新 orders.status = 'refunded'
```

---

## 用戶管理

### `/admin/users` 列表頁

```typescript
// 只顯示非敏感資料
const { data: users } = await supabase
  .from('user_profiles')
  .select(`
    user_id, name, created_at,
    goals:user_goals(type, is_active),
    plans:diet_plans(diet_method, is_active)
  `)
  .order('created_at', { ascending: false })

// 注意：不顯示 avoid_foods、allergens 等個資（客服不需要知道）
```

### `/admin/users/[id]` 用戶詳情

**super_admin 和 cs 都可以看**：
- 姓名、Email、註冊日
- 目前飲食計畫（飲食法、開始日）
- 訂單列表（最近 10 筆）
- 訂閱狀態

**只有 super_admin 可以操作**：
- 停用帳號按鈕

```typescript
async function suspendUser(userId: string) {
  // 呼叫 Edge Function（需要 service role key）
  // Edge Function 呼叫 supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' })
}
```

---

## 開發順序建議

後台跟主產品並行，但不要搶資源，建議這樣排：

| 時機 | 後台任務 |
|------|---------|
| Phase 1 完成後 | 建立 `/admin/login` + Middleware + 角色設定工具（命令列即可）|
| Phase 2 完成後 | `/admin/products` 商品管理（這時候你需要上商品資料）|
| Phase 4 開始前 | `/admin/orders` 訂單管理（商城上線前要準備好）|
| Phase 4 完成後 | `/admin/dashboard` BI 儀表板（有真實訂單才有數據看）|
| Phase 4 完成後 | `/admin/users` 用戶管理 |
| 之後有需要再做 | `/admin/settings` 角色管理介面 |

> `/admin/products` 是最優先的，因為商品資料要先進去，商城才能測試推薦邏輯。  
> BI 儀表板最後做，沒有真實數據做了也沒意義。

# 健康商城規格

> 這是整個平台的商業終點。  
> 推薦邏輯的正確性直接影響轉換率，每次改動前仔細閱讀此文件。

---

## 核心設計原則

> **商品是實體配送，推薦說明基於「長期飲食計畫符合度」，不是「今日即時熱量缺口」。**

用戶看到的推薦說明應該是：
- ✅「符合你的地中海飲食計畫」
- ✅「不含你設定的忌食成分（蝦、花生）」
- ✅「高蛋白配方，符合你的增肌目標」
- ❌「今天你還差 300 kcal，這個蛋白棒正好」（不要這樣做）

---

## 推薦分數計算

```typescript
// lib/calculations.ts（同一個計算文件）
export function calcRecommendScore(
  product: Product,
  profile: UserProfile,
  goal: UserGoal,
  purchaseHistory: string[] // product_id 陣列
): number {
  let score = 0

  // 1. 過敏安全（硬過濾，有衝突直接排除）
  const hasAllergenConflict = profile.allergens.some(
    allergen => !product.allergen_free.includes(allergen)
  )
  if (hasAllergenConflict) return -999

  // 2. 飲食法符合度（最重要，0–40 分）
  if (product.diet_tags.includes(profile.diet_plan?.diet_method ?? '')) {
    score += 40
  }

  // 3. 忌食食材安全（0–20 分）
  const ingredientSafe = !profile.avoid_foods.some(
    food => product.ingredients?.includes(food)
  )
  if (ingredientSafe) score += 20

  // 4. 長期目標符合（0–15 分）
  if (goal.type === 'lose_weight' && product.calories < 200) score += 10
  if (goal.type === 'lose_weight' && (product.sugar_g ?? 0) < 5) score += 5
  if (goal.type === 'gain_muscle' && product.protein_g > 15) score += 15

  // 5. 回購歷史（0–15 分）
  if (purchaseHistory.includes(product.id)) score += 15

  // 6. 評分（0–10 分）
  score += (product.avg_rating / 5) * 10

  return score
}
```

### 推薦分數快取策略

分數不在每次進商城時即時計算，而是用快取表 `user_product_scores`：

**觸發重算的時機**：
1. 用戶在設定頁更新飲食偏好（飲食法、忌食、過敏原、目標）
2. 新商品上架時（對所有用戶計算這個新商品的分數）

**重算方式**：更新設定 → 呼叫 Edge Function `recalculate-scores` → 批次更新 `user_product_scores`

---

## 符合度說明生成

```typescript
// lib/shop/fit-reasons.ts
export interface FitReason {
  type: 'positive' | 'info' | 'caution'
  text: string
}

export function generateFitReasons(
  product: Product,
  profile: UserProfile,
  goal: UserGoal
): FitReason[] {
  const reasons: FitReason[] = []
  const dietLabels: Record<string, string> = {
    mediterranean: '地中海飲食',
    keto: '生酮飲食',
    high_protein: '高蛋白飲食',
    low_cal: '低熱量飲食',
    intermittent: '間歇性斷食',
    dash: 'DASH 飲食'
  }

  // 1. 飲食法符合（最重要，一定顯示）
  const dietMethod = profile.diet_plan?.diet_method ?? ''
  if (product.diet_tags.includes(dietMethod)) {
    reasons.push({
      type: 'positive',
      text: `符合你的${dietLabels[dietMethod] ?? ''}飲食計畫`
    })
  }

  // 2. 忌食安全（一定顯示）
  if (profile.avoid_foods.length > 0) {
    const ingredientSafe = !profile.avoid_foods.some(
      food => product.ingredients?.includes(food)
    )
    if (ingredientSafe) {
      reasons.push({
        type: 'positive',
        text: `不含你設定的忌食成分（${profile.avoid_foods.join('、')}）`
      })
    }
  }

  // 3. 過敏原安全
  if (profile.allergens.length > 0) {
    const allergenLabels: Record<string, string> = {
      shellfish: '甲殼類', peanuts: '花生', gluten: '麩質',
      dairy: '乳製品', eggs: '蛋', soy: '大豆', tree_nuts: '堅果'
    }
    const safeAllergens = profile.allergens.filter(a => product.allergen_free.includes(a))
    if (safeAllergens.length === profile.allergens.length) {
      reasons.push({
        type: 'positive',
        text: `不含你的過敏原（${safeAllergens.map(a => allergenLabels[a]).join('、')}）`
      })
    }
  }

  // 4. 目標相關
  if (goal.type === 'gain_muscle' && product.protein_g > 15) {
    reasons.push({
      type: 'positive',
      text: `每份含 ${product.protein_g}g 蛋白質，支持你的增肌目標`
    })
  }
  if (goal.type === 'lose_weight' && product.calories < 150) {
    reasons.push({
      type: 'positive',
      text: `低熱量（${product.calories} kcal/份），適合控制總攝取量`
    })
  }

  // 5. 通用建議
  reasons.push({
    type: 'info',
    text: '適合作為兩餐之間的點心，維持飽足感'
  })

  return reasons.slice(0, 4) // 最多顯示 4 條
}
```

---

## Stripe 金流整合

### 一次性購買流程

```typescript
// supabase/functions/create-checkout/index.ts
Deno.serve(async (req) => {
  const { variantIds, quantities, userId } = await req.json()

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

  // 從 DB 取得 variant 資料
  const variants = await getVariants(variantIds)

  // 建立 Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: variants.map((v, i) => ({
      price: v.stripe_price_id,
      quantity: quantities[i]
    })),
    success_url: `${Deno.env.get('APP_URL')}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${Deno.env.get('APP_URL')}/shop`,
    metadata: { user_id: userId }
  })

  return Response.json({ url: session.url })
})
```

### 訂閱購買流程

```typescript
// 訂閱改用 Stripe Billing，mode: 'subscription'
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: variant.stripe_sub_price_id, quantity }],
  subscription_data: {
    metadata: { user_id: userId, frequency }
  },
  // ...
})
```

### Webhook 處理

```typescript
// supabase/functions/stripe-webhook/index.ts
Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  // 驗簽（最重要，不能跳過）
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
      break

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionCancel(event.data.object as Stripe.Subscription)
      break
  }

  return new Response('ok')
})

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (session.mode === 'payment') {
    // 寫入 orders + order_items
    await supabase.from('orders').insert({
      id: session.payment_intent as string,
      user_id: session.metadata!.user_id,
      status: 'paid',
      total: session.amount_total! / 100,
      stripe_session_id: session.id
    })
    // 寫 order_items（從 session.line_items 取得）
  }
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  await supabase.from('subscriptions').upsert({
    stripe_subscription_id: sub.id,
    user_id: sub.metadata.user_id,
    stripe_customer_id: sub.customer as string,
    status: sub.status === 'active' ? 'active'
          : sub.status === 'paused' ? 'paused'
          : 'cancelled',
    next_ship_at: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'stripe_subscription_id' })
}
```

---

## 商城頁面查詢邏輯

### 商品列表（含個人化排序）

```typescript
// 商城進入時的資料查詢
async function getShopProducts(userId: string, category?: string, filters?: string[]) {
  // 1. 取用戶的推薦分數
  const { data: scores } = await supabase
    .from('user_product_scores')
    .select('product_id, score')
    .eq('user_id', userId)
    .gt('score', 0) // 排除 -999 的商品

  const scoreMap = new Map(scores?.map(s => [s.product_id, s.score]))

  // 2. 取商品清單
  let query = supabase
    .from('products')
    .select('*, brand:brands(name, logo_url), variants:product_variants(id, label, price, sub_price, stock)')
    .eq('is_active', true)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  // 篩選器
  if (filters?.includes('high_protein')) {
    query = query.gte('protein_g', 15)
  }
  if (filters?.includes('low_sugar')) {
    query = query.lte('sugar_g', 5)
  }
  if (filters?.includes('organic')) {
    query = query.contains('cert_tags', ['organic'])
  }

  const { data: products } = await query

  // 3. 排序（推薦分數高的在前）
  return products?.sort((a, b) => {
    const scoreA = scoreMap.get(a.id) ?? 0
    const scoreB = scoreMap.get(b.id) ?? 0
    return scoreB - scoreA
  })
}
```

---

## 商城頁面規格

### `/shop`（商城首頁）

| 區塊 | 說明 |
|------|------|
| 個人化說明文字 | 「為你的{飲食法}計畫篩選，已排除{過敏原}商品」 |
| 搜尋列 | 商品名、品牌全文搜尋 |
| 分類切換 | 全部 / 堅果 / 蛋白棒 / 保健品 / 飲品 / 點心 / 代餐 |
| 篩選 Chips | 符合飲食法 / 高蛋白（>15g）/ 低糖（<5g）/ 有機認證 |
| 商品卡格 | 2 欄網格，依推薦分數排序 |
| 精選品牌列 | 品牌 logo + 名稱 + 商品數量 |

### `/shop/[productId]`（商品詳情）

| 區塊 | 說明 |
|------|------|
| 商品圖 + badge | 飲食法符合標籤 + 收藏按鈕（暫不實作） |
| 基本資訊 | 商品名、品牌、標籤 |
| 為什麼適合你 | `generateFitReasons()` 輸出，綠色卡片 |
| 規格選擇 | `product_variants` 多規格 |
| 數量選擇 | 加減按鈕 |
| 購買方式 | 單次購買 / 訂閱切換 |
| 訂閱頻率 | 每週 / 每兩週 / 每月（訂閱模式才顯示） |
| 價格顯示 | 訂閱模式顯示 `sub_price`，即時更新 |
| CTA | 加入購物車 / 立即訂閱 |
| 完整營養標示 | 表格，每份數據 |
| 成分與產地 | 純文字 + 認證標籤 |
| 品牌故事 | 品牌簡介 + 查看全系列連結 |
| 同品牌商品 | 橫向捲動卡片 |

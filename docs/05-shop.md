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

使用者可於設定頁「商城設定」關閉 **`shop_personalize_recommendations`**：商城列表與 Dashboard 推薦改為不依個人化分數排序（改以評分等一般排序），但快取表仍可能存在；開啟時維持讀取 `user_product_scores`。

---

## 購物點（訂閱轉點）

- **1 點 = 1 元（新台幣）** 折抵商城消費，實際發放／扣抵／餘額遞延以方案條款與後端為準。
- 餘額欄位：`user_profiles.shop_points_balance`；流水：`user_shop_point_ledger`（`subscription_grant`、`order_redeem`、`admin_adjust`、`other`）。

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

## 藍新金流（MPG）整合

### 一次性購買流程（幕前交易）

1. 前端呼叫 Edge `create-newebpay-payment`（攜帶使用者 JWT），請求 body：`{ items: [{ variantId, qty }] }`。
2. Edge 依 `product_variants.price` 與庫存驗證後，建立 `orders`（`status=pending`）、`order_items`，並產生唯一 `merchant_order_no`（對應藍新 `MerchantOrderNo`，≤30 字）。
3. 以 `NEWEBPAY_HASH_KEY` / `NEWEBPAY_HASH_IV` 加密交易參數為 `TradeInfo`，計算 `TradeSha`，回傳 `paymentUrl`（測試：`https://ccore.newebpay.com/MPG/mpg_gateway`）與表單欄位；瀏覽器 **POST** 至藍新。
4. `ReturnURL` 指向 Next 之 `/shop/payment-return`，再導向 `/shop/success`（僅使用者體驗；**入帳以 Notify 為準**）。
5. `NotifyURL` 指向 Edge `newebpay-notify`：驗簽、解密後若 `TradeStatus=1`，將訂單更新為 `paid` 並寫入 `gateway_trade_no`（交易編號）。

### 定期扣款（未來）

商城 MVP **僅單次結帳**；`subscriptions` 相關表仍可能在 DB 中（歷史 migration），應用程式與本文件之查詢範例不以訂閱為準。未來若接藍新定期定額，再另開規格。

### 環境變數（Edge Secrets）

- `NEWEBPAY_MERCHANT_ID`、`NEWEBPAY_HASH_KEY`、`NEWEBPAY_HASH_IV`
- `NEWEBPAY_ENV`：`test`（預設）或 `production`（MPG 網址切換）
- `APP_URL` / `NEXT_PUBLIC_APP_URL`：ReturnURL 組字用

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
    .select('*, brand:brands(name, logo_url), variants:product_variants(id, label, price, stock)')
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
| 商品卡格 | 2 欄網格，依推薦分數排序；圖區右下角購物車／最愛 icon（不佔滿卡可點進詳情）；購物車開置中彈窗僅含圖、規格、數量與「加入購物車」（無庫存規格 disabled） |
| 精選品牌列 | 品牌 logo + 名稱 + 商品數量 |
| 捲動後浮動鈕 | 購物車、我的最愛（愛心導向 `/shop/favorites`；與購物車同欄、愛心在上） |

### `/shop/[productId]`（商品詳情）

| 區塊 | 說明 |
|------|------|
| 商品圖 + badge | 飲食法符合標籤 + 右上角「我的最愛」切換；捲動後浮動區另有愛心鈕（與 Header 同步） |
| 基本資訊 | 商品名、品牌、標籤 |
| 為什麼適合你 | `generateFitReasons()` 輸出，綠色卡片 |
| 規格選擇 | `product_variants` 多規格 |
| 數量選擇 | 點「加入購物車」或「立即結帳」後開啟置中彈窗，於彈窗內以加減鈕選擇數量（有庫存上限時「+」受上限限制） |
| 價格顯示 | 頁面顯示目前規格之單次售價（`product_variants.price`）；彈窗內顯示依數量計算之小計 |
| CTA | 加入購物車、立即結帳（點擊後於彈窗確認數量並執行對應動作） |
| 完整營養標示 | 表格，每份數據 |
| 成分與產地 | 純文字 + 認證標籤 |
| 品牌故事 | 品牌簡介 + 查看全系列連結 |
| 同品牌商品 | 橫向捲動卡片 |

### `/shop/favorites`（我的最愛）

| 區塊 | 說明 |
|------|------|
| 資料 | `user_product_favorites`，依收藏時間新→舊；只顯示仍 `is_active` 的商品 |
| 列表 | 與商城首頁相同 2 欄商品卡版型；卡片角可取消收藏 |
| 入口 | 商城首頁 `PageHeader` 右上角愛心連結至本頁 |

### `/shop` 頂欄補充

| 元素 | 說明 |
|------|------|
| 我的最愛 | 連結至 `/shop/favorites`（與商品頁「切換收藏」圖示語意區隔：此為進入列表） |

# API 端點清單

> 精簡版：移除了語音、條碼、PDF 匯出、裝置整合相關端點。  
> 絕大多數後端邏輯在 Supabase Edge Functions，Next.js API Routes 只保留一個。

---

## 架構說明

```
前端（Next.js）
  └── 讀取資料：直接用 Supabase client（anon key + RLS 保護）
  └── 寫入一般資料：直接用 Supabase client
  └── AI 任務觸發：前端 / Edge Function（依任務型別）
  └── 金流操作：Supabase Edge Function

Supabase Edge Functions（後端邏輯）
  └── AI Worker（QStash callback）
  └── 商城建單（`create-shop-order`）
  └── 綠界金流／物流 callback（`ecpay-return`、`ecpay-logistics-return` 等）
  └── 推薦分數重算
  └── 週報 cron（pg_cron 觸發）
```

---

## Next.js API Routes

目前無保留的 Next.js API Route；資料寫入以 Supabase client 與 Edge Functions 為主。

---

## Supabase Edge Functions

### AI 相關

| Function 名稱 | 觸發方式 | 說明 |
|--------------|---------|------|
| `ai-photo-request` | 前端（使用者 JWT）| 建立 `photo_analysis_jobs`（`job_kind=meal`）並觸發 QStash → `ai-photo-analyze` |
| `ai-photo-analyze` | QStash callback | Claude Vision；餐桌食物營養 JSON（陣列或單一物件） |
| `label-guard-request` | 前端（使用者 JWT）| 建立 `label_guard_jobs` 並觸發 QStash → `label-guard-analyze` |
| `label-guard-analyze` | QStash callback | Claude Vision；標示報告 JSON（`_kind: label_guard_report`） |
| `ai-weekly-insight` | pg_cron（每週日 21:00）| 生成週報洞察，寫入 `weekly_insights` |

**`ai-photo-request` 輸入**（JSON body）：
- `storagePath`：必填，路徑須為 `{userId}/...`（餐點圖建議 `food-photos` bucket）。

**`label-guard-request` 輸入**（JSON body）：
- `storagePath`：必填，路徑須為 `{userId}/...`（標示圖用 `label-guard-photos` bucket）。

**`ai-photo-analyze` / `label-guard-analyze` 輸入格式**（QStash 轉送）：
```json
{ "jobId": "uuid" }
```

**`ai-photo-analyze` 輸出**（寫入 DB）：
- 更新 `photo_analysis_jobs.status` = `ready` 或 `error`
- 寫入 `photo_analysis_jobs.result_json`：食物營養項目陣列或單一物件

**`label-guard-analyze` 輸出**（寫入 DB）：
- 更新 `label_guard_jobs.status` = `ready` 或 `error`
- 寫入 `label_guard_jobs.result_json`：單一物件且含 `_kind: "label_guard_report"`

---

### 金流／物流（綠界）

| Function 名稱 | 觸發方式 | 說明 |
|--------------|---------|------|
| `create-shop-order` | Server Action + JWT | 建立 `pending` 訂單、回傳 `orderId` + `logisticsQueue` |
| `ecpay-logistics-selection` | GET popup + JWT | 導向綠界 V2 門市／宅配選擇 |
| `ecpay-logistics-client-return` | 綠界 POST | 暫存單轉正式物流、更新 `checkout_snapshot` |
| `ecpay-logistics-return` | 綠界 POST | 物流貨態回寫 `sub_orders` |
| `ecpay-checkout` | GET popup + JWT | AIO V5 付款表單 HTML |
| `ecpay-return` | 綠界 POST | ReturnURL 入帳（`RtnCode=1` → `paid`） |
| `ecpay-payment-info` | 綠界 POST | ATM／超商代碼取號（維持 pending） |
| `ecpay-order-result` | 綠界 POST | OrderResultURL 瀏覽器返回（`?appOrigin=` 絕對 URL 導回 `/shop?checkout=1&…`）；**須公開 Edge，不可改 Next 需登入 route** |
| `ecpay-query-trade` | super_admin JWT | 查詢交易狀態 |
| `ecpay-logistics-print` | super_admin / cs GET `?format=json` | V2 託運單列印 bridge（`PrintTradeDocument` → `{ action, fields }`） |

**`create-shop-order` 輸出**：`{ orderId, logisticsQueue, total }`。詳見 `docs/third/ecpay-payment-spec.md`、`ecpay-logistics-spec.md`。

**`ecpay-return`**：回應 `1|OK`；驗證 CheckMac 後更新訂單。

**`ecpay-order-result`**：query `appOrigin`（瀏覽器 origin，fallback Edge `APP_URL`）；回傳 HTML 更新 opener。Next `/shop/payment-return` 僅本機 GET 測試，不作 OrderResultURL。

訂閱定期定額未接。

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
```

---

## Supabase Storage Bucket 設定

| Bucket 名稱 | 存取權限 | 用途 |
|------------|---------|------|
| `food-photos` | 私有（只有 owner 可存取） | 用戶拍照上傳的餐點照片 |
| `label-guard-photos` | 私有（只有 owner 可存取） | 「食品安全守衛」食品標示／成分表拍照 |

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

**綠界 ReturnURL**（`ecpay-return`：驗證 CheckMac SHA256；`RtnCode !== 1` 不入帳）：
```typescript
// 參數排序 + .NET UrlEncode + SHA256；詳見 docs/third/ecpay-integration-handbook.md
```

**QStash Callback**（必須驗簽）：
```typescript
// 使用 QSTASH_CURRENT_SIGNING_KEY 驗證
// 驗失敗 → 回 401，QStash 會自動重試
```

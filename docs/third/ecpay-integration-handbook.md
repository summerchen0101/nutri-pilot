# ECPay 金流＋物流整合手冊（C2C）

> 查閱基準：綠界官方文件（developers.ecpay.com.tw），2026-05。
>
> 本文件供**跨系統串接**使用：介接密鑰、端點、演算法、官方連結。
> 流程與領域規格請見 [ecpay-payment-spec.md](./ecpay-payment-spec.md)、[ecpay-logistics-spec.md](./ecpay-logistics-spec.md)。

---

## 1. 官方文件與後台

| 資源 | 連結 |
|------|------|
| 開發者入口 | https://developers.ecpay.com.tw/ |
| 全方位金流（總覽） | https://developers.ecpay.com.tw/2509/ |
| AioCheckOut V5（導轉付款） | https://developers.ecpay.com.tw/2864/ |
| 付款結果通知（ReturnURL） | https://developers.ecpay.com.tw/2878/ |
| 取號結果通知（PaymentInfoURL） | https://developers.ecpay.com.tw/2881/ |
| 金流測試帳號說明 | https://developers.ecpay.com.tw/21984/ |
| 物流測試介接資訊 | https://developers.ecpay.com.tw/8270/ |
| 物流 FAQ（MerchantID 配對） | https://developers.ecpay.com.tw/62208/ |

**測試環境廠商後台**

- URL：https://vendor-stage.ecpay.com.tw/
- 帳號：`stagetest1234`
- 密碼：`test1234`
- 統一編號：`53538851`

**正式環境廠商後台**

- URL：https://vendor.ecpay.com.tw/User/LogOn_Step1
- 介接資訊路徑：**系統設定 → 系統介接設定 → 介接資訊**

---

## 2. 測試金鑰（重要：金流與物流 C2C 不同組）

綠界測試環境中，**MerchantID 與 HashKey / HashIV 必須成對使用**。金流（AIO）與物流 C2C 在測試時使用**不同**特店編號與金鑰。

| 用途 | 環境 | MerchantID | HashKey | HashIV |
|------|------|------------|---------|--------|
| 全方位金流（AIO） | 測試 | `2000132` | `ejCk326UnaZWKisg` | `q9jcZX8Ib9LM8wYk` |
| 物流 C2C（店到店） | 測試 | `2000933` | `XBERn1YOvpM9nfZc` | `h1ONHk4P4yqbl5LK` |

注意事項：

- 複製 HashKey / HashIV 時請用複製貼上，避免手動輸入多餘空白導致 CheckMac 失敗。
- **勿**用金流測試 key 呼叫物流 API，常見錯誤：「找不到加密金鑰，請確認是否有申請開通此物流方式」。
- 本專案金流預設值見 `src/lib/ecpay.ts`；物流讀 env，未設定時會 fallback 到 `ECPAY_MERCHANT_ID` / `ECPAY_HASH_*`——**另一系統串 C2C 物流時，測試請明確設定物流專用變數（見 §4）**。

### 2.1 金流測試端點

| 項目 | 測試 | 正式 |
|------|------|------|
| Action URL | `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` | `https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5` |
| 傳輸 | POST，`application/x-www-form-urlencoded` | 同左 |

### 2.2 物流 C2C 測試端點

本專案使用 **Logistics V2**（門市選擇、暫存單建立、查詢）及 V1 列印等。完整 URL 定義於 `src/lib/ecpay-logistics.ts`。

**測試（`logistics-stage.ecpay.com.tw`）**

| API | URL |
|-----|-----|
| 門市選擇 V2 | `https://logistics-stage.ecpay.com.tw/Express/v2/RedirectToLogisticsSelection` |
| 由暫存單建立 | `https://logistics-stage.ecpay.com.tw/Express/v2/CreateByTempTrade` |
| 查詢 V2 | `https://logistics-stage.ecpay.com.tw/Express/v2/QueryLogisticsTradeInfo` |
| 建立物流單（V1） | `https://logistics-stage.ecpay.com.tw/Express/Create` |
| 查詢（V1 Helper） | `https://logistics-stage.ecpay.com.tw/Helper/QueryLogisticsTradeInfo/V5` |
| 列印 7-11 C2C | `https://logistics-stage.ecpay.com.tw/Express/PrintUniMartC2COrderInfo` |
| 列印全家 C2C | `https://logistics-stage.ecpay.com.tw/Express/PrintFAMIC2COrderInfo` |
| 列印 OK C2C | `https://logistics-stage.ecpay.com.tw/Express/PrintOKMARTC2COrderInfo` |

**正式（`logistics.ecpay.com.tw`）**：路徑相同，僅網域改為 `logistics.ecpay.com.tw`（無 `-stage`）。

### 2.3 C2C LogisticsSubType（本專案）

| logistics_type | logistics_subtype（C2C） |
|----------------|--------------------------|
| `CVS` | `UNIMARTC2C`, `FAMIC2C`, `HILIFEC2C`, `OKMARTC2C`, `UNIMARTFREEZE` |
| `HOME` | `TCAT`, `POST` |

勿與 B2C 參數混淆（例如 `UNIMART` vs `UNIMARTC2C`）。

### 2.4 C2C 測試門市（固定店號）

當無法透過電子地圖選店時，測試可用店號（見 `src/lib/logistics/providers.ts`）：

| 超商 | StoreID | 備註 |
|------|---------|------|
| 7-ELEVEN | `131386` | UNIMARTC2C |
| 全家 | `006598` | FAMIC2C |
| OK | `1328` | OKMARTC2C |

---

## 3. 正式金鑰（Production）

**請勿將正式 HashKey / HashIV 寫入 repo 或此文件。**

取得步驟：

1. 登入 [綠界廠商後台（正式）](https://vendor.ecpay.com.tw/User/LogOn_Step1)
2. 前往 **系統設定 → 系統介接設定 → 介接資訊**
3. 記錄 **特店編號 (MerchantID)**、**串接金鑰 (HashKey)**、**串接金鑰 (HashIV)**
4. 注入部署環境的密鑰管理（Vercel、1Password 等）

上線前檢查：

- [ ] `ECPAY_STAGE=false`（或等同邏輯切換至正式 URL）
- [ ] 金流、物流 MerchantID / Key 皆為正式介接資訊
- [ ] 後台已開通 **全方位金流** 與 **C2C 物流**（物流管理 → 物流廠商；有「店到店」即 C2C）
- [ ] `LogisticsSubType` 與申請模式一致（C2C 使用 `*C2C` 後綴）
- [ ] 所有 `ReturnURL` / `ClientReplyURL` / `ServerReplyURL` 為 **公網 HTTPS**，且可被綠界 server POST
- [ ] 測試 MerchantID（`2000132` / `2000933`）未用於正式 API URL

---

## 4. 環境變數

本專案慣例（另一系統可對照調整命名）：

| 變數 | 說明 |
|------|------|
| `ECPAY_STAGE` | 未設或 ≠ `false` → 測試端點；`false` → 正式端點 |
| `ECPAY_MERCHANT_ID` | 金流 MerchantID |
| `ECPAY_HASH_KEY` | 金流 HashKey |
| `ECPAY_HASH_IV` | 金流 HashIV |
| `ECPAY_LOGISTICS_MERCHANT_ID` | 物流 MerchantID（C2C 測試建議 `2000933`） |
| `ECPAY_LOGISTICS_HASH_KEY` | 物流 HashKey |
| `ECPAY_LOGISTICS_HASH_IV` | 物流 HashIV |
| `ECPAY_LOGISTICS_SENDER_NAME` | 寄件人姓名 |
| `ECPAY_LOGISTICS_SENDER_CELLPHONE` | 寄件人手機（C2C 常必填） |
| `ECPAY_LOGISTICS_SENDER_ZIP_CODE` | 寄件人郵遞區號 |
| `ECPAY_LOGISTICS_SENDER_ADDRESS` | 寄件人地址 |
| `ECPAY_LOGISTICS_SENDER_PHONE` | 寄件人電話（選填） |
| `APP_URL` | 對外 HTTPS 根網址（callback 組 URL 用，勿尾隨 `/`） |

**測試環境範例（.env.local，勿 commit）**

```bash
ECPAY_STAGE=true
APP_URL=https://your-ngrok-or-staging.example.com

# 金流（AIO）— 測試 2000132
ECPAY_MERCHANT_ID=2000132
ECPAY_HASH_KEY=ejCk326UnaZWKisg
ECPAY_HASH_IV=q9jcZX8Ib9LM8wYk

# 物流 C2C — 測試 2000933（與金流分開）
ECPAY_LOGISTICS_MERCHANT_ID=2000933
ECPAY_LOGISTICS_HASH_KEY=XBERn1YOvpM9nfZc
ECPAY_LOGISTICS_HASH_IV=h1ONHk4P4yqbl5LK
ECPAY_LOGISTICS_SENDER_NAME=您的品牌名稱
ECPAY_LOGISTICS_SENDER_CELLPHONE=0912345678
ECPAY_LOGISTICS_SENDER_ZIP_CODE=100
ECPAY_LOGISTICS_SENDER_ADDRESS=台北市中正區範例路1號
```

**正式環境範例**

```bash
ECPAY_STAGE=false
APP_URL=https://www.your-production-domain.com

ECPAY_MERCHANT_ID=<後台介接資訊>
ECPAY_HASH_KEY=<後台介接資訊>
ECPAY_HASH_IV=<後台介接資訊>

ECPAY_LOGISTICS_MERCHANT_ID=<後台介接資訊，若與金流相同可填相同值>
ECPAY_LOGISTICS_HASH_KEY=<後台介接資訊>
ECPAY_LOGISTICS_HASH_IV=<後台介接資訊>
# ...寄件人欄位同上
```

未設 `ECPAY_MERCHANT_ID` 時，本專案金流會 fallback 至程式內測試預設（`2000132`）；物流則**不會**自動帶入 C2C 測試 key，需明確設定 `ECPAY_LOGISTICS_*`。

---

## 5. 介接演算法

### 5.1 金流 AIO — CheckMacValue（SHA256）

1. 參數依 key 字母排序（排除 `CheckMacValue`、空值；驗證 callback 時可含空值，見實作 `includeEmpty`）
2. 組成 `key1=value1&key2=value2&...`
3. 前後加上 `HashKey=...&` 與 `&HashIV=...`
4. 整段做 **.NET 風格 UrlEncode**（見 `dotNetUrlEncode`）
5. 編碼結果轉 **小寫**（`toLowerCase`）
6. **SHA256**，結果轉大寫 hex

參考：`src/lib/ecpay.ts` — `generateEcpayCheckMacValue`、`verifyEcpayCheckMacValue`

金流主要欄位（建立訂單導轉）：

| 欄位 | 說明 |
|------|------|
| `MerchantID` | 特店編號 |
| `MerchantTradeNo` | 特店訂單編號（唯一，≤20 字） |
| `MerchantTradeDate` | `yyyy/MM/dd HH:mm:ss`（台北時區） |
| `PaymentType` | 固定 `aio` |
| `TotalAmount` | 整數新台幣金額 |
| `TradeDesc` | 交易描述 |
| `ItemName` | 商品名稱（多筆以 `#` 分隔） |
| `ReturnURL` | Server 付款結果通知 |
| `OrderResultURL` | 瀏覽器返回（popup 流程） |
| `PaymentInfoURL` | 非即時付款取號通知（ATM/CVS 等） |
| `ChoosePayment` | 例：`ALL` |
| `EncryptType` | 固定 `1` |
| `CheckMacValue` | 檢查碼 |

### 5.2 物流 V1 — CheckMacValue（MD5）

步驟與金流類似（排序、HashKey/HashIV 包裹、.NET UrlEncode），但雜湊為 **MD5** 大寫 hex。

參考：`src/lib/ecpay-logistics.ts` — `generateEcpayLogisticsCheckMacValue`

V1 `Express/Create` 等：Content-Type 為 **application/x-www-form-urlencoded**，勿誤用 JSON。

### 5.3 物流 V2 — AES 信封

Request body（JSON）：

```json
{
  "MerchantID": "<merchantId>",
  "RqHeader": { "Timestamp": <unix_seconds> },
  "Data": "<base64 AES-128-CBC ciphertext>"
}
```

`Data` 加密步驟（與綠界規格一致）：

1. 將業務 JSON `stringify`
2. 對 JSON 字串做 **upper-case percent-encoding**（見 `upperCaseUrlEncode`）
3. **AES-128-CBC**，key = HashKey、iv = HashIV（16 bytes）
4. 輸出 **base64**

Response：解析 JSON 後對 `Data` 欄位解密，再解析內層 JSON。

參考：`src/lib/ecpay-logistics.ts` — `encryptEcpayLogisticsData`、`decryptEcpayLogisticsData`、`postEcpayLogisticsV2Json`

---

## 6. Callback 與本專案路由

以 `{APP_URL}` 代表你的對外 HTTPS 網域。另一系統請替換為自己的 path，但建議維持 **Server callback 更新狀態**、**Client callback 結束 popup** 的分工。

### 6.1 金流（NutriPilot 實作）

| 綠界參數 | 用途 | NutriPilot 路由 |
|----------|------|-----------------|
| （入口） | 產生付款 form | Edge `GET ecpay-checkout?orderId=&appOrigin=` |
| `ReturnURL` | Server 付款結果（權威） | Edge `POST …/ecpay-return` |
| `OrderResultURL` | 瀏覽器 / popup 結束 | Edge `POST …/ecpay-order-result?appOrigin=` |
| `PaymentInfoURL` | ATM/CVS 取號（pending） | Edge `POST …/ecpay-payment-info` |

流程細節：[ecpay-payment-spec.md](./ecpay-payment-spec.md)  
實作：`src/lib/payments.ts` — `prepareEcpayCheckout`

`ReturnURL`：`RtnCode === "1"` 時標記訂單已付款。  
`PaymentInfoURL`：非即時付款已取號、尚未入帳 → `payment_status: pending`。

### 6.2 物流 C2C

| 綠界參數 | 用途 | membership-engine 路由 |
|----------|------|------------------------|
| （入口） | V2 門市選擇 | `GET /api/admin/logistics/ecpay/selection?orderId=&logisticsType=&method=&goodsAmount=` |
| `ClientReplyURL` | 選店 popup 結束 | `POST /api/admin/logistics/ecpay/client-return?orderId=` |
| `ServerReplyURL` | 物流狀態更新 | `POST /api/logistics/ecpay/return` |

流程細節：[ecpay-logistics-spec.md](./ecpay-logistics-spec.md)

client-return 典型步驟：解析暫存結果 → `CreateByTempTrade` → 查詢 → 寫入訂單／訂閱配送欄位 → 導回主視窗。

---

## 7. 另一系統最小實作清單

### 金流

1. 建立內部訂單，產生唯一 `MerchantTradeNo`
2. 組 AIO 欄位 + `CheckMacValue`（SHA256）
3. 以 HTML form POST 導向 stage/prod `AioCheckOut/V5`
4. 實作 `ReturnURL`：驗證 CheckMac → 依 `RtnCode` 更新訂單
5. （選用）`OrderResultURL` 處理瀏覽器返回；`PaymentInfoURL` 處理取號

### 物流 C2C

1. 設定寄件人與 `ECPAY_LOGISTICS_*`（測試用 `2000933`）
2. `RedirectToLogisticsSelection`（V2 JSON 信封）開啟選店
3. `ClientReplyURL` 收到結果後 `CreateByTempTrade` + 查詢
4. `ServerReplyURL` 接收貨態更新
5. `LogisticsSubType` 使用 `*C2C`；`logistics_type` 區分 `CVS` / `HOME`

### 本專案內建測試頁

- 金流：`/admin/test-payment`
- 物流：`/admin/test-logistics`

---

## 8. 常見錯誤

| 現象 | 可能原因 |
|------|----------|
| 綠界 AIO **10200073 CheckMacValue Error**（點「前往付款」即失敗） | 見下方 **§8.1** |
| 找不到加密金鑰 | 金流 key 用於物流；或 MerchantID 與 LogisticsSubType / 環境 URL 不配對 |
| 帳號暫停使用 | 測試 MerchantID 打到正式 `logistics.ecpay.com.tw`（或反之） |
| CheckMac 驗證失敗 | key/iv 錯誤、參數排序、.NET encode 實作不一致、callback 空值處理 |
| 物流建立失敗 | C2C 卻傳 B2C subtype；V1 API 用了 `application/json` |
| 超商姓名錯誤 | 收件人姓名須 4–10 字元（中文 2–5 字） |
| 列印託運單異常 | 應由 client 端 form POST 接收轉跳，不宜純 server 攔截 body |

### 8.1 10200073 CheckMacValue Error（AIO 表單被拒）

錯誤發生在 **POST 至 `payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` 當下**，尚未進入付款頁；回傳 URL、`ShopEcpayReturnHandler` 與此無關。

**排查順序：**

1. **金流 key 三件套**（`.env.local` → Edge Secrets）：`ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`。測試環境範例 MerchantID=`2000132`；**不可混用物流 key**（物流 C2C 為 `2000933` + `ECPAY_LOGISTICS_*`）。物流 popup 正常、金流失敗時，幾乎一定是金流 key 與 MerchantID 不配。
2. **同步 Secrets**：只改本機 env 不會更新 Edge。執行：
   ```bash
   set -a && source .env.local && set +a && ./scripts/ecpay-setup.sh
   ```
   可選確認：`supabase secrets list`（僅顯示名稱）。
3. **部署 checkout**：`supabase functions deploy ecpay-checkout`（`ecpay-setup.sh` 已含部署時可略）。
4. **Console 對照**（篩選 `ecpay-checkout`）：`openPayment bridge fields` 應含
   - `merchantId` 與綠界後台金流商店代號一致
   - `checkMacSelfOk: true`（Edge 自驗通過；若 API 回 500 `CheckMac self-verify failed` 表示 key 仍錯）
   - `OrderResultURL` 為 `…/ecpay-order-result?appOrigin=https://…`（**不是** `/shop/payment-return`）
5. **重新下單**再點「前往付款」；popup 應顯示綠界付款方式選擇頁，而非 CheckMac 錯誤頁。

更多說明：[物流常見技術 FAQ](https://developers.ecpay.com.tw/62208/)

---

## 9. 本專案程式對照

| 主題 | 路徑 |
|------|------|
| 金流設定 / CheckMac | `src/lib/ecpay.ts` |
| 金流 checkout / callback | `src/lib/payments.ts`、`src/app/api/payments/ecpay/*` |
| 物流設定 / V2 加解密 | `src/lib/ecpay-logistics.ts` |
| 物流 subtype 正規化 | `src/lib/ecpay-logistics-codes.ts` |
| 物流 selection / return | `src/app/api/admin/logistics/ecpay/*`、`src/app/api/logistics/ecpay/return` |
| Popup 行為 | `src/lib/ecpay-popup.ts`、`src/app/subscription/confirm/use-ecpay-popup.ts` |

---

## 相關文件

- [ECPay Payment Spec](./ecpay-payment-spec.md) — 付款流程、訂單狀態、popup UX
- [ECPay Logistics Spec](./ecpay-logistics-spec.md) — 物流領域模型、CVS/HOME、metadata
- [Security Runbook](./security-runbook.md) — checkout 等 API 存取控制

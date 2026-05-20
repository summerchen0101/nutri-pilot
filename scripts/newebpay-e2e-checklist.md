# 藍新 MPG 端到端驗收清單

## 前置

1. `.env.local` 填入 `NEWEBPAY_MERCHANT_ID`、`NEWEBPAY_HASH_KEY`、`NEWEBPAY_HASH_IV`
2. `set -a && source .env.local && set +a && ./scripts/newebpay-setup.sh`（寫入 Edge Secrets）
3. 藍新會員專區：商店已開通 **CREDIT**；NotifyURL 可設  
   `https://jkmhpvpjremtsgopanmg.supabase.co/functions/v1/newebpay-notify`
4. ReturnURL：`APP_URL` 須 https 且 80/443 埠（本機請 ngrok）

## 前台

- [ ] 登入 → 商城加購 → 結帳 → 導向藍新 MPG
- [ ] 付款完成 → Notify 後 `orders.status = paid`、`gateway_trade_no` 有值
- [ ] ReturnURL 跳轉 `/shop/success`

## 後台

- [ ] super_admin `/admin/finance/payments`：測試單 paid、藍新欄位齊全
- [ ] `/admin/orders/[id]`：金流資訊卡、退款 SOP
- [ ] super_admin「向藍新查詢」回傳 TradeStatus
- [ ] cs 可更新 shipped；super_admin 退款後可標 cancelled

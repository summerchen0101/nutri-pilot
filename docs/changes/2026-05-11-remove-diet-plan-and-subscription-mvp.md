# 移除飲食計畫模組與訂閱／sub_price（MVP 收斂）

**日期**：2026-05-11  
**影響規格**：docs/02-schema.md、docs/01-stack.md、docs/04-ai-engine.md、docs/05-shop.md、docs/07-api.md、docs/08-admin.md、.cursor/rules/01-tech-rules.mdc  
**類型**：刪除 | 修改 | 技術替換

## 原規格

- 資料庫含 `diet_plans` / `daily_menus` / `meals` / `meal_items`，`food_logs` 可連結計畫餐並使用 `log_type` 計畫語意；AI 規格含菜單生成與換食材；商城／後台／API 文件含訂閱與 `sub_price` 敘述。

## 實際做法

- 新增 migration **`022_remove_diet_plan_and_plan_log_links.sql`**：刪除計畫相關四表、`food_logs.from_plan_meal_id`，`method` 僅允許 `manual`／`photo`／`search`／`ai_analysis`（歷史 `from_plan` 列改為 `manual`）。
- 新增 **`023_drop_product_variants_sub_price.sql`**；**`008_shop_seed_catalog.sql`** 種子 INSERT 不再帶 `sub_price`。
- **`001_init.sql`**／**`020_shop_newebpay.sql`** 於 `subscriptions`／`subscription_items` 區塊加 `DISABLED` 註解（SQL 未刪除，表仍可由舊 migration 建立）。
- 應用程式：移除 `/plan` middleware、`LogClient` 計畫預填與 `commitPrefillFromPlanAction`、刪除 `menu-generation`／`swap-ingredient` prompt 檔；`food_logs` 寫入加 `log_type` 廢棄 TODO。
- **`src/types/supabase.ts`**：已配合 migration 手動除去已刪表與欄位（遠端若未套用 migration，請於套用後執行 `supabase gen types` 再比對）。
- 主規格文件與 **`01-tech-rules.mdc`** 同步為「無菜單生成／換食材、無 menu-request API、商城單次結帳」。

## 原因

MVP 聚焦飲食紀錄、守衛、商城單次購買；計畫與訂閱相關維運成本高且非本階段目標。

## 後續

- 於 Supabase 套用 `022`／`023` 後務必 **`supabase gen types`**。
- 若永久不上線訂閱／計畫，可再評估從 `001_init` 拆出僅新環境使用的精簡 schema（另議）。

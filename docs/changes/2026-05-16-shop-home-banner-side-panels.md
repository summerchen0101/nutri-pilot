# 商城首頁：Banner 資料表、側滑分類／篩選、排序

**日期**：2026-05-16
**影響規格**：docs/05-shop.md、docs/09-ui-design.md（Banner／側欄為新增行為）
**類型**：修改 | 新增

## 原規格

- `/shop` 於頁面上方為「分類切換」與「篩選 Chips」，頂欄僅說明「我的最愛」等補充。
- 未描述首頂 Banner 區塊與右側滑入之分類／篩選面板。
- 表格列「高蛋白（>15g）／低糖（<5g）」與程式長期使用 ≥／≤ 門檻並存（本次維持程式門檻不變）。

## 實際做法

1. **資料**：新增 `shop_home_banners` 表（migration `032_shop_home_banners.sql`），已登入使用者可 `SELECT` `is_active = true` 之列；維護預留 Studio／後台（本輪無 Admin UI）。
2. **版型**：頂欄右側新增「分類」「篩選」icon（含篩選／排序作用中角標），原橫向分類與 chips 移除；首屏為 **Banner**（有資料則顯示標題／副標／圖／選填連結，無資料或查詢失敗則淡綠占位）。
3. **互動**：分類與篩選改為 **右側滑入面板**（結構對齊購物車側欄 `ShopRightSheet`）；篩選側欄內含既有四項條件（toggle）、**排序**（個人化推薦／評分／價格低→高／高→低）；關閉個人化推薦時停用「個人化推薦」排序並自動改以評分邏輯。
4. **狀態**：使用 Zustand `shop-catalog-ui-store` 連結頂欄（Suspense 外）與商品列表（Suspense 內）。
5. **載入**：Banner 與商品目錄分別包 `Suspense`，骨架不重複 Banner。

## 原因

對齊常見電商資訊層級（Banner → 列表）、釋放首屏高度；側欄與既有購物車面板一致以降低認知成本。

## 後續

- 將 `docs/05-shop.md` 的 `/shop` 表格更新為「Banner + 頂欄 icon 開啟分類／篩選側欄 + 排序」並記載 `shop_home_banners`。
- 後台維護 Banner CRUD（service_role／Admin）。

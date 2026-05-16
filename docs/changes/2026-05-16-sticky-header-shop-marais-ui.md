# 全站 Sticky Header 與商城 MARAIS 風格改版

**日期**：2026-05-16  
**影響規格**：docs/09-ui-design.md、docs/08（商城相關若有）  
**類型**：修改

## 原規格

- 頁頂標題列（`PageHeader`）為一般區塊排版，捲動時不固定；無「捲動後透白＋霧化」行為。
- 商城列表以卡片浮動圖示加購；詳情頁於頁內選規格並以獨立彈窗加購／結帳。

## 實際做法

- 新增 `StickyPageHeader`（`sticky-page-header-shell`）：捲動超過閾值後 `bg-background`、`backdrop-blur`、底線；全站 `(main)` 頁面改為使用該元件。
- 商城首頁：橫向分類列（sticky offset 對齊頁首高度）、Banner 主副標置中、商品卡改為圖上類別角標与下方「購買」＋收藏列。
- 新增統一 `ShopAddToCartSheet`：列表「購買」與詳情底部「選擇商品規格」共用；多規格顯示 pill，單一規格不顯示規格區；無規格時 CTA disabled 並提示。
- 商品詳情改為 `ProductDetailMaraisClient`：品牌列、分頁（介紹／配送／付款）、底部固定列（收藏＋選擇商品規格）；內文區塊收斂至分頁內。

## 原因

對齊產品參考之電商動線與層次（固定頂欄、加購 bottom sheet 一致），並維持既有設計代幣（Primary CTA 仍為 `Button` default／Shadow Grey 系統）。

## 後續

- 若需恢復詳情頁「立即結帳」一鍵，可在 sheet 或購物車動線另行補上。
- `ShopCartScrollFab` 與 sticky 頁首同時存在時，IntersectionObserver 判定可能較常為「頁首可見」；若需調整浮動購物車出現邏輯可改為 scroll 閾值或 sentinel。

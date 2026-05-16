# 商城頁首 MARAIS 風（襯線字標與中性 icon）

**日期**：2026-05-16  
**影響規格**：docs/09-ui-design.md  
**類型**：修改

## 原規格

- 頁首標題多搭配 `PageHeading`（主色／綠標）語意。  
- 全站頁首圖示按鈕使用透明底 + **主色細框**（`HEADER_ACTION_ICON_CLASS`）。

## 實際做法

1. **商城列表頁首中央**：以襯線字級（`font-serif` + `text-foreground`）顯示品牌字串「Nutri Guard」，**不用** `text-primary` 綠標；透過 `PageHeader` 之 `titleSlot` 呈現，並保留 `title="健康商城"` 供螢幕閱讀器。  
2. **商城專用圖示按鈕**：新增 `SHOP_HEADER_ICON_BUTTON_CLASS`（淺底、細邊框、中性前景），分類／篩選／收藏／購物車／搜尋／分享等商城頁首圖示改用此樣式；購物車以紅色圓形角標顯示數量總和。  
3. **字型載入**：在商城 `layout` 以 `next/font` 注入 `--font-shop-serif`（Noto Serif TC），Tailwind `font-serif` 對應該變數堆疊，**不**強制全站載入。  
4. **搜尋**：`shop-catalog-ui-store` 儲存 `catalogSearchQuery` 與 overlay 狀態；列表依商品名稱 trim／不分大小寫篩選；詳情頁搜尋按鈕導向 `/shop` 並開啟搜尋 overlay。  
5. **分享**：Web Share API，不支援則複製網址並以既有訊息元件提示。  
6. **詳情頁首**：左側返回 + 商城首頁連結；右側搜尋、分享、收藏、購物車（角標）。

## 原因

對齊「MARAIS」式商城識別：中央字標用襯線與中性色、頁首圖示改淺底圓角以與全站主色框區隔；功能上補齊搜尋、分享與購物車數量回饋。

## 後續

若未來要將同一套中性頁首 icon 擴及全站，需另開規格修訂並統一 docs/09 中「頁首圖示」段落。

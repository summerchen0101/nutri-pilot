# 商城目錄商品卡片對齊 UI 色系與按鈕規範

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（Sea Green／Shadow Grey 按鈕、主色淡底標籤）  
**類型**：修改

## 原規格／先前實作

`docs/09-ui-design.md` 已定義：主 CTA 為 Shadow Grey 滿版、次要互動為 Sea Green outline；分類／成功類標籤可用主色淡底 `#E8F5EE` 與其上的深綠文字。

先前 [`shop-catalog-product-card`](src/app/(main)/shop/shop-catalog-product-card.tsx) 的「購買」為中性灰底、「購物車」圖示使用 `--steel-accent`（Steel Blue）；圖上分類為深色半透明覆蓋，與全站商品卡語意不一致。

## 實際做法

1. 「購買」改為 [`Button`](src/components/ui/button.tsx) `variant="default"`（與商品詳情底部主 CTA 一致），圖示繼承按鈕字色，移除鋼藍。  
2. 「收藏」改為 `Button` `variant="outline"`（1.5px `border-primary`），並以 `group`／`group-hover:text-white` 讓已選擇收藏時 hover 仍與 outline 主按鈕 hover 一致。  
3. 分類標籤改為 `bg-primary-light`、`text-primary-foreground`、`text-caption`、`rounded-full`，與站內其他主色淡底 chip 一致。

## 原因

避免商城列表出現唯一的 Steel Blue 點綴；按鈕角色與 UI 設計文件及商品詳情頁對齊，提升品牌色系一致性。

## 後續

若規格書需逐條描述「商城目錄卡片」元件，可於 `docs/09-ui-design.md` 補一小節示意。

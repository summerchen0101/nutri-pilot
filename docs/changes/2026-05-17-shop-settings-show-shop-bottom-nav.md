# 商城設定與 commerce 捷徑頁：顯示商城底欄

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（商城導覽）、異動 [2026-05-17-shop-settings-shell-no-bottom-nav.md](./2026-05-17-shop-settings-shell-no-bottom-nav.md)  
**類型**：修改

## 原規格／前次決策

- `/shop/settings`（含子路徑）與 `/settings/orders`、`/settings/points`、`/settings/coupons`：不顯示商城底欄、亦不顯示主程式 BottomNav（見前次異動）。

## 實際做法

- 上述路徑改為顯示 `ShopBottomNav`（與 `/shop/*` 商品列表等一致）。
- `shouldHideAllBottomNavPathname` 僅保留商品詳情頁（維持詳情專用版面與無雙底欄）。
- `/settings/orders` 等仍不顯示主程式 BottomNav，由 `MainAppShell` 在 commerce 捷徑路徑改顯示商城底欄。
- `ShopBottomNav` 的「設定」在 commerce 捷徑頁一併標示為目前頁（`isShopCommerceShortcutPathname`）。

## 原因

使用者從商城進入設定與訂單／點數／優惠券流程時，仍須能在商城導覽間切換，與「商城設定」語意一致。

## 後續

若更新 `docs/09-ui-design.md`，請改寫「設定 hub 無底欄」為「設定 hub 與 commerce 捷徑顯示商城底欄」。

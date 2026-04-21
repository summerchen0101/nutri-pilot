# 運動類型：間歇有氧文案、球類與跳繩、分類下拉

**日期**：2026-04-21  
**影響規格**：docs/02-schema.md  
**類型**：修改  

## 原規格

`activity_type` 無跳繩／球類 slug；紀錄頁以 chip 選類型。

## 實際做法

- migration `016_activity_types_sports.sql`：CHECK 新增 `jump_rope`、`basketball`、`tennis`、`badminton`。
- `hiit` 顯示為「間歇有氧」；估熱表補新類型。
- `/log` 運動表單「類型」改為 `<select>` + `<optgroup>`（有氧與心肺／球類／肌力／瑜珈與伸展／其他）。

## 原因

常見運動項目補齊與手機版面改為下拉較易操作。

## 後續

部署需執行 `016` migration。

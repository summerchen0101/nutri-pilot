# 食品安全守衛：添加物條列說明（味精、麥芽糊精、色素等）

**日期**：2026-05-19

**影響規格**：`docs/06-pages.md`（`/guard`）

## 異動摘要

- 新增 `label-guard-additive-catalog.ts`：調味劑、抗氧化劑、色素、麥芽糊精等條列說明（常見子成分 + 一句備註）。
- 彈窗改為【本次標示】+【此類常見成分說明】；chip 點擊顯示 catalog 條列，(i) 另附包裝 `label_names`。
- lookups 補齊麥芽糊精、色素、香料、麩酸鈉等；prompt 必掃味精／麥芽糊精／色素並充實 `label_name_details` 範例。

## 原因／後續

使用者需區分百科與包裝原文，並以條列閱讀各類添加物。部署 `label-guard-analyze` 後新分析效果最佳。

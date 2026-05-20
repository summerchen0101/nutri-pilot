export interface ProductDisplayOrderFields {
  sort_order: number;
  name: string;
}

/** 後台手動排序：sort_order 升冪，平手依名稱。 */
export function compareByAdminSortOrder(
  a: ProductDisplayOrderFields,
  b: ProductDisplayOrderFields,
): number {
  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order;
  }
  return a.name.localeCompare(b.name, 'zh-Hant');
}

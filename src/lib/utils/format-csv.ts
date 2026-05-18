/** CSV 欄位.escape（RFC 4180 子集） */
export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsvRow(cells: readonly string[]): string {
  return cells.map(escapeCsvCell).join(',');
}

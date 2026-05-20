const TAIPEI = 'Asia/Taipei';

/** Server／Client 皆應固定 Asia/Taipei；Client 元件請改由 Server 預先格式化以避免 hydration 落差。 */
export function formatTaipeiDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TAIPEI,
  });
}

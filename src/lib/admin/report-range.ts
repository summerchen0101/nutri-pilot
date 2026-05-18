const MS_PER_DAY = 86400000;

export type AdminReportRange = {
  /** inclusive start 00:00 UTC */
  startIso: string;
  /** exclusive end boundary（次日 00:00 UTC） */
  endExclusiveIso: string;
  /** `<input type="date">` value yyyy-mm-dd UTC */
  startDateStr: string;
  endDateStr: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toUtcDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 解析後台報表日期區間（URL query）；預設為過去 30 日（含今日 UTC）。 */
export function parseAdminReportRange(searchParams: {
  start?: string;
  end?: string;
}): AdminReportRange {
  const todayUtc = new Date();
  const defaultEnd = new Date(
    Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate(),
    ),
  );
  const defaultStart = new Date(defaultEnd.getTime() - 29 * MS_PER_DAY);

  let startDay = defaultStart;
  let endDay = defaultEnd;

  if (searchParams.start?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = searchParams.start.split('-').map(Number);
    startDay = new Date(Date.UTC(y, m - 1, d));
  }
  if (searchParams.end?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = searchParams.end.split('-').map(Number);
    endDay = new Date(Date.UTC(y, m - 1, d));
  }

  if (startDay.getTime() > endDay.getTime()) {
    const t = startDay;
    startDay = endDay;
    endDay = t;
  }

  const startIso = startDay.toISOString();
  const endExclusive = new Date(endDay.getTime() + MS_PER_DAY);
  const endExclusiveIso = endExclusive.toISOString();

  return {
    startIso,
    endExclusiveIso,
    startDateStr: toUtcDateStr(startDay),
    endDateStr: toUtcDateStr(endDay),
  };
}

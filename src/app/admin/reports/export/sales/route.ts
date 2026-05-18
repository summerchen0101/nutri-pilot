import { NextResponse } from 'next/server';

import { parseAdminReportRange } from '@/lib/admin/report-range';
import { getAdminRole, staffCan } from '@/lib/admin';
import { toCsvRow } from '@/lib/utils/format-csv';
import { createClient } from '@/lib/supabase/server';

const BATCH = 500;

export async function GET(request: Request) {
  const role = await getAdminRole();
  if (!staffCan(role, 'analytics.finance')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseAdminReportRange({
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
  });

  const supabase = createClient();
  const byDay = new Map<string, { count: number; gmv: number }>();

  let offset = 0;
  for (;;) {
    const { data: batch, error } = await supabase
      .from('orders')
      .select('created_at,total')
      .eq('status', 'paid')
      .gte('created_at', range.startIso)
      .lt('created_at', range.endExclusiveIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = batch ?? [];
    for (const r of rows) {
      if (!r.created_at) continue;
      const day = r.created_at.slice(0, 10);
      const cur = byDay.get(day) ?? { count: 0, gmv: 0 };
      cur.count += 1;
      cur.gmv += Number(r.total ?? 0);
      byDay.set(day, cur);
    }

    if (rows.length < BATCH) break;
    offset += BATCH;
  }

  const sortedDays = Array.from(byDay.keys()).sort();
  const lines = [
    toCsvRow(['day_utc', 'paid_order_count', 'gmv']),
    ...sortedDays.map((day) => {
      const v = byDay.get(day)!;
      return toCsvRow([day, String(v.count), String(v.gmv)]);
    }),
  ];

  const body = `\uFEFF${lines.join('\r\n')}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales-by-day-${range.startDateStr}_${range.endDateStr}.csv"`,
    },
  });
}

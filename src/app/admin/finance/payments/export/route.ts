import { NextResponse } from 'next/server';

import { parseAdminReportRange } from '@/lib/admin/report-range';
import { getAdminRole, staffCan } from '@/lib/admin';
import { toCsvRow } from '@/lib/utils/format-csv';
import { createClient } from '@/lib/supabase/server';

const EXPORT_PAGE_SIZE = 1000;
const EXPORT_MAX_ROWS = 5000;

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
  const header = toCsvRow([
    'created_at_utc',
    'order_id',
    'public_order_no',
    'merchant_order_no',
    'gateway_trade_no',
    'gateway_session_ref',
    'payment_gateway',
    'status',
    'total',
    'user_id',
  ]);

  const lines: string[] = [header];
  let offset = 0;

  for (;;) {
    const { data: batch, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        public_order_no,
        merchant_order_no,
        gateway_trade_no,
        gateway_session_ref,
        payment_gateway,
        status,
        total,
        user_id,
        created_at
      `,
      )
      .gte('created_at', range.startIso)
      .lt('created_at', range.endExclusiveIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + EXPORT_PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const chunk = batch ?? [];
    for (const r of chunk) {
      lines.push(
        toCsvRow([
          r.created_at ?? '',
          r.id,
          r.public_order_no ?? '',
          r.merchant_order_no ?? '',
          r.gateway_trade_no ?? '',
          r.gateway_session_ref ?? '',
          r.payment_gateway,
          r.status,
          String(r.total),
          r.user_id,
        ]),
      );
    }

    if (chunk.length < EXPORT_PAGE_SIZE) break;
    offset += EXPORT_PAGE_SIZE;
    if (offset >= EXPORT_MAX_ROWS) break;
  }

  const body = `\uFEFF${lines.join('\r\n')}`;
  const filename = `payments-${range.startDateStr}_${range.endDateStr}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

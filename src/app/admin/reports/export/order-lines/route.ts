import { NextResponse } from 'next/server';

import { parseAdminReportRange } from '@/lib/admin/report-range';
import { getAdminRole, staffCan } from '@/lib/admin';
import { toCsvRow } from '@/lib/utils/format-csv';
import { createClient } from '@/lib/supabase/server';

const BATCH = 80;

type VariantJoin = {
  label?: string;
  product?: { name: string } | { name: string }[] | null;
} | null;

export async function GET(request: Request) {
  const role = await getAdminRole();
  const allowed =
    role === 'super_admin' || staffCan(role, 'product.edit');
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseAdminReportRange({
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
  });

  const supabase = createClient();

  const header = toCsvRow([
    'order_created_at_utc',
    'public_order_no',
    'order_id',
    'product_name',
    'variant_label',
    'qty',
    'unit_price',
    'line_total',
  ]);
  const lines: string[] = [header];

  let offset = 0;
  for (;;) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        public_order_no,
        created_at,
        items:order_items(
          qty,
          unit_price,
          variant:product_variants(
            label,
            product:products(name)
          )
        )
      `,
      )
      .eq('status', 'paid')
      .gte('created_at', range.startIso)
      .lt('created_at', range.endExclusiveIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const chunk = orders ?? [];
    for (const o of chunk) {
      const itemsRaw = o.items;
      const items = Array.isArray(itemsRaw) ? itemsRaw : [];
      const created = o.created_at ?? '';
      const pub = o.public_order_no ?? '';
      for (const line of items) {
        const variant = line.variant as unknown as VariantJoin;
        const prod = variant?.product;
        const productName = Array.isArray(prod) ? prod[0]?.name : prod?.name;
        const qty = Number(line.qty);
        const unit = Number(line.unit_price);
        lines.push(
          toCsvRow([
            created,
            pub,
            o.id,
            productName ?? '',
            variant?.label ?? '',
            String(qty),
            String(unit),
            String(qty * unit),
          ]),
        );
      }
    }

    if (chunk.length < BATCH) break;
    offset += BATCH;
  }

  const body = `\uFEFF${lines.join('\r\n')}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="order-lines-${range.startDateStr}_${range.endDateStr}.csv"`,
    },
  });
}

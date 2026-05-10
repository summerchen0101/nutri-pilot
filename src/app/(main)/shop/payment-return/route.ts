import { NextResponse } from 'next/server';

function baseAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function redirectToSuccess(merchantOrderNo: string | null): NextResponse {
  const base = baseAppUrl();
  const loc = new URL('/shop/success', base);
  if (merchantOrderNo) {
    loc.searchParams.set('merchant_order_no', merchantOrderNo);
  }
  return NextResponse.redirect(loc, 303);
}

/** 藍新 MPG ReturnURL（多為 POST application/x-www-form-urlencoded）。 */
export async function POST(request: Request) {
  let merchantOrderNo: string | null = null;
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/x-www-form-urlencoded')) {
    const raw = await request.text();
    merchantOrderNo = new URLSearchParams(raw).get('MerchantOrderNo');
  } else {
    try {
      const j = (await request.json()) as Record<string, unknown>;
      const v = j.MerchantOrderNo;
      merchantOrderNo = typeof v === 'string' ? v : null;
    } catch {
      merchantOrderNo = null;
    }
  }
  return redirectToSuccess(merchantOrderNo);
}

export async function GET(request: Request) {
  const u = new URL(request.url);
  return redirectToSuccess(u.searchParams.get('merchant_order_no'));
}

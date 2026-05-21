import { headers } from 'next/headers';

/** Server Action／Route：目前請求的對外 origin（ngrok／正式網域） */
export async function resolveRequestAppOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';

  if (host) {
    const hostname = host.split(',')[0]?.trim() ?? host;
    return `${proto}://${hostname}`;
  }

  const fallback = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fallback) return fallback;

  return 'http://localhost:3000';
}

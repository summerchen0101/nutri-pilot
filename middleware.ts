import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieRow = Parameters<SetAllCookies>[0][number];

/** Longest prefix first so `/admin/products` wins over `/admin` if we add broader keys later. */
const ROLE_ACCESS: Record<string, string[]> = {
  '/admin/dashboard': ['super_admin', 'editor'],
  '/admin/products': ['super_admin', 'editor'],
  '/admin/brands': ['super_admin', 'editor'],
  '/admin/orders': ['super_admin', 'cs'],
  '/admin/subscriptions': ['super_admin', 'cs'],
  '/admin/users': ['super_admin', 'cs'],
  '/admin/settings': ['super_admin'],
};

const SORTED_ADMIN_PATHS = Object.keys(ROLE_ACCESS).sort(
  (a, b) => b.length - a.length,
);

const MAIN_PROTECTED_PREFIXES = [
  '/dashboard',
  '/plan',
  '/log',
  '/analytics',
  '/shop',
  '/settings',
  '/onboarding',
];

function isMainProtectedRoute(pathname: string): boolean {
  return MAIN_PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }: CookieRow) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: CookieRow) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      return supabaseResponse;
    }

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const role = user.app_metadata?.admin_role as string | undefined;
    if (!role) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const matchedPath = SORTED_ADMIN_PATHS.find((p) => pathname.startsWith(p));
    if (
      matchedPath &&
      !ROLE_ACCESS[matchedPath]?.includes(role)
    ) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    return supabaseResponse;
  }

  if (isMainProtectedRoute(pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/plan/:path*',
    '/log',
    '/log/:path*',
    '/analytics/:path*',
    '/shop/:path*',
    '/settings/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/admin/:path*',
  ],
};

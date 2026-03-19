import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokenPayload } from './lib/auth-edge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/seed')
  ) {
    return NextResponse.next();
  }

  // Protected: /dashboard/* and /api/* (except /api/auth/login)
  const isProtectedPage = pathname.startsWith('/dashboard');
  const isProtectedApi =
    pathname.startsWith('/api') && !pathname.startsWith('/api/auth/login') && !pathname.startsWith('/api/seed');

  if (isProtectedPage || isProtectedApi) {
    const payload = await getTokenPayload(request);

    if (!payload) {
      if (isProtectedApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Root redirect: / → /dashboard if logged in, /login if not
  if (pathname === '/') {
    const payload = await getTokenPayload(request);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/api/:path*'],
};

import { NextResponse } from 'next/server';

function isAdminSession(sessionValue) {
  if (!sessionValue) return false;
  if (sessionValue.includes("mock_customer")) return false;
  if (sessionValue.length > 50) return true;
  return false;
}

export function proxy(request) {
  const session = request.cookies.get('session')?.value;
  const pathname = request.nextUrl.pathname;

  // Handle admin routing & protection
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const isLoggedIn = isAdminSession(session);

    // 1. /admin or /admin/
    if (pathname === '/admin' || pathname === '/admin/') {
      if (isLoggedIn) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    }

    // 2. /admin/login
    if (pathname === '/admin/login') {
      if (isLoggedIn) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }

    // 3. All other /admin/* routes
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/profile', '/orders'],
};

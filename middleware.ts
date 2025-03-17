import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/app/utils/supabase/middleware';

// List of paths that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/products',
  '/settings',
  '/help',
];

// List of paths that should be accessible without authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/callback',
  '/auth/sign-in/google',
  '/login',
  '/register',
];

export async function middleware(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const { supabase, response } = createClient(request);

  // Check if the user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get the pathname from the URL
  const { pathname } = request.nextUrl;

  // Check if the path is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // If the route is protected and the user is not authenticated, redirect to the login page
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('message', 'Please sign in to access this page');
    return NextResponse.redirect(redirectUrl);
  }

  // If the user is authenticated and trying to access the login page, redirect to the dashboard
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};

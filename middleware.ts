import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const protectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/tables') ||
    pathname.startsWith('/workspaces') ||
    pathname.startsWith('/comp-data') ||
    pathname.startsWith('/data-tables') ||
    pathname.startsWith('/templates') ||
    pathname.startsWith('/users');
  const authRoute = pathname === '/login' || pathname === '/signup';

  if (protectedRoute && !user) return NextResponse.redirect(new URL('/login', request.url));
  if (authRoute && user) return NextResponse.redirect(new URL('/dashboard', request.url));
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };

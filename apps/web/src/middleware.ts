import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. נתיבים שדורשים התחברות (אזורים פרטיים)
const PROTECTED_ROUTES = [
  '/dashboard', 
  '/build', 
  '/simulate', 
  '/connect', 
  '/publish'
];

// 2. נתיבים של אורחים בלבד
const AUTH_ROUTES = [
  '/login', 
  '/register', 
  '/signup'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- תיקון קריטי: החרגה מפורשת של ה-Webhook של וואטסאפ ---
  // אנחנו רוצים שפייסבוק תמיד יוכל לגשת לנתיב הזה בלי שום הפרעה
  if (pathname.startsWith('/api/webhooks/whatsapp')) {
    return NextResponse.next();
  }

  // --- שלב א: דילוג על קבצים סטטיים וכל שאר ה-API ---
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/static') || 
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  // --- שלב ב: הגנה על נתיבים פרטיים ---
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- שלב ג: מניעת כניסה לדפי התחברות למשתמש מחובר ---
  const isAuthRoute = AUTH_ROUTES.some((route) => 
    pathname.startsWith(route)
  );

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// הגדרת ה-Matcher - וודא ש-api מוחרג כאן
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
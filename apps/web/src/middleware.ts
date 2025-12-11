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

// 2. נתיבים של אורחים בלבד (אם אתה מחובר, אין לך מה לחפש פה)
const AUTH_ROUTES = [
  '/login', 
  '/register', 
  '/signup' // ליתר ביטחון
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- שלב א: דילוג על קבצים סטטיים ו-API ---
  // אנחנו לא רוצים שה-Middleware ירוץ על תמונות או קריאות שרת, זה מאט את האתר
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') // מזהה סיומות קבצים כמו .jpg, .css
  ) {
    return NextResponse.next();
  }

  // בדיקת הטוקן (האם המשתמש מחובר?)
  const token = request.cookies.get('token')?.value;

  // --- שלב ב: הגנה על נתיבים פרטיים ---
  // אם המשתמש מנסה להיכנס לאזור אישי ואין לו טוקן
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    // הפניה לדף ההתחברות
    const loginUrl = new URL('/login', request.url);
    
    // אופציונלי: שמירת הדף שאליו הוא ניסה להגיע כדי להחזיר אותו לשם אח"כ
    loginUrl.searchParams.set('callbackUrl', pathname);
    
    return NextResponse.redirect(loginUrl);
  }

  // --- שלב ג: מניעת כניסה לדפי התחברות למשתמש מחובר ---
  // אם המשתמש כבר מחובר ומנסה להיכנס ל-Login או Register
  const isAuthRoute = AUTH_ROUTES.some((route) => 
    pathname.startsWith(route)
  );

  if (isAuthRoute && token) {
    // הוא כבר מחובר? שלח אותו ישר לעבודה
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // אם הכל תקין, תן לו לעבור
  return NextResponse.next();
}

// הגדרת ה-Matcher כדי לחסוך ביצועים
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
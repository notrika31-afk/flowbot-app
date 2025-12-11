import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';

// --- Login Handler (POST) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, mode } = body;

    // TODO: שלב חיבור דאטה-בייס (Prisma / Mongoose)
    // כרגע: בדיקת דמה שמאשרת כל כניסה (לצורך פיתוח UI)
    const user = {
      id: 'user_' + Math.floor(Math.random() * 10000),
      email: email, 
      role: 'USER',
      name: 'משתמש FlowBot'
    };

    // אם היינו בודקים סיסמה והיא שגויה:
    // return NextResponse.json({ message: "פרטים שגויים" }, { status: 401 });

    // 1. יצירת הטוקן
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: 'USER'
    });

    // 2. שמירת העוגייה (קריטי לסנכרון שביקשת)
    cookies().set({
      name: 'token',
      value: token,
      httpOnly: true, // מגן מפני גניבת טוקן ב-JS
      secure: process.env.NODE_ENV === 'production', // ב-Production רק ב-HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 יום - שומר על המשתמש מחובר
    });

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה פנימית בשרת' },
      { status: 500 }
    );
  }
}

// --- Logout Handler (DELETE) ---
// פונקציה זו תאפשר למשתמש להתנתק בצורה נקייה
export async function DELETE() {
  try {
    // מחיקת העוגייה
    cookies().delete('token');
    
    return NextResponse.json({ success: true, message: 'התנתקת בהצלחה' });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
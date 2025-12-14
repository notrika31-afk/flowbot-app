import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // ייבוא החיבור האמיתי לדאטה בייס

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, mode } = body; // mode = 'login' או 'register'

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'חובה להזין אימייל וסיסמה' },
        { status: 400 }
      );
    }

    let user;

    // --- תרחיש 1: הרשמה (Register) ---
    if (mode === 'register' || mode === 'signup') {
      // בדיקה אם המשתמש כבר קיים
      const existingUser = await prisma.user.findUnique({
        where: { email: email },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'האימייל הזה כבר קיים במערכת' },
          { status: 409 }
        );
      }

      // יצירת משתמש חדש ב-Neon!
      user = await prisma.user.create({
        data: {
          email: email,
          password: password, // הערה: מומלץ להצפין סיסמה עם bcrypt בעתיד
          name: email.split('@')[0], // שם זמני
          role: 'USER',
        },
      });
    } 
    
    // --- תרחיש 2: התחברות (Login) ---
    else {
      // חיפוש המשתמש ב-Neon
      user = await prisma.user.findUnique({
        where: { email: email },
      });

      if (!user || user.password !== password) {
        return NextResponse.json(
          { success: false, message: 'אימייל או סיסמה שגויים' },
          { status: 401 }
        );
      }
    }

    // --- הצלחה: יצירת טוקן ושמירת עוגייה ---
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'USER'
    });

    cookies().set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 יום
    });

    return NextResponse.json({ success: true, user });

  } catch (error: any) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאת חיבור למסד הנתונים: ' + error.message },
      { status: 500 }
    );
  }
}

// --- Logout ---
export async function DELETE() {
  try {
    cookies().delete('token');
    return NextResponse.json({ success: true, message: 'התנתקת בהצלחה' });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
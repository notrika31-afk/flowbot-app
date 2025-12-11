import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // חובה לייבא את פריזמה

// 👇 התיקון הקריטי ל-Vercel
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "session endpoint available"
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, mode } = body;

    // 1. בדיקה האם המשתמש קיים ב-DB
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // 2. יצירה אוטומטית במקרה שאין משתמש (רק לפיתוח)
    if (!user) {
      console.log(`User ${email} not found in DB. Creating automatically...`);
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // שם זמני
        },
      });
    }

    // 3. יצירת הטוקן עם ID אמיתי
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: 'USER'
    });

    // 4. שמירת העוגייה
    cookies().set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true, user });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'שגיאה פנימית בשרת' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    cookies().delete('token');
    return NextResponse.json({ success: true, message: 'התנתקת בהצלחה' });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
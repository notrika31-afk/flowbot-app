import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';
// התיקון: אנחנו לא יכולים לשנות את הדרך שבה prisma מיובאת בנתיב זה
import { prisma } from '@/lib/prisma'; 

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, mode } = body;

    // 1. בדיקה האם המשתמש קיים ב-DB
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // 2. אם אנחנו במצב "פיתוח" ואין משתמש - ניצור אותו אוטומטית (כדי למנוע את השגיאה)
    if (!user) {
      console.log(`User ${email} not found in DB. Creating automatically...`);
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // שם זמני
        },
      });
    }

    // 3. יצירת הטוקן עם ה-ID האמיתי מה-DB
    // ה-await הקריטי שהוספנו קודם נשאר כדי למנוע שגיאות.
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
      maxAge: 60 * 60 * 24 * 30, // 30 יום
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
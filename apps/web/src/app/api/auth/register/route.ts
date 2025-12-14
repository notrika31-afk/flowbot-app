import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  console.log("--- Starting Registration Process ---");

  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 1. ולידציה
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'חובה להזין אימייל וסיסמה' },
        { status: 400 }
      );
    }

    // 2. בדיקת כפילות
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'האימייל הזה כבר קיים במערכת' },
        { status: 409 }
      );
    }

    // 3. יצירת משתמש (ללא role ב-DB)
    console.log("Creating user in DB...");
    const newUser = await prisma.user.create({
      data: {
        email,
        password, // הערה: מומלץ להצפין בעתיד
        name: name || email.split('@')[0],
        // role: 'USER',  <-- הוסר כי השדה לא קיים ב-Schema שלך
      },
    });
    console.log("User created:", newUser.id);

    // 4. יצירת טוקן
    // אנחנו מגדירים כאן role ידנית לטוקן כי הוא לא קיים ב-DB
    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: 'USER' 
    });

    // 5. קוקי
    cookies().set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });

  } catch (error: any) {
    console.error("REGISTRATION FATAL ERROR:", error);
    return NextResponse.json(
      { success: false, message: 'שגיאת שרת: ' + error.message },
      { status: 500 }
    );
  }
}
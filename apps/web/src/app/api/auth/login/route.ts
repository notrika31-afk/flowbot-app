import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma"; // חיבור למסד הנתונים האמיתי

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. ולידציה בסיסית
    if (!email || !password) {
      return NextResponse.json(
        { error: "נא להזין אימייל וסיסמה" },
        { status: 400 }
      );
    }

    // 2. חיפוש המשתמש ב-DB האמיתי
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // 3. בדיקת סיסמה
    // הערה: כרגע זה משווה טקסט רגיל (בהתאם לקוד ההרשמה).
    // בעתיד נשדרג להשוואת Hash (כמו bcrypt.compare)
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "אימייל או סיסמה שגויים" },
        { status: 401 }
      );
    }

    // 4. יצירת טוקן
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'USER',
    });

    // 5. הגדרת הקוקי בדפדפן
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 יום (תואם להרשמה)
      sameSite: "lax",
    });

    // החזרת תשובה חיובית עם פרטי המשתמש (לשימוש בקונטקסט בלקוח)
    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error("[LOGIN_ERROR]", error);
    
    // בדיקה האם השגיאה היא בגלל הסוד החסר
    if (error.message?.includes("Missing JWT_SECRET")) {
      return NextResponse.json(
        { error: "Server Configuration Error: Missing JWT_SECRET" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "שגיאת שרת פנימית בעת ההתחברות" },
      { status: 500 }
    );
  }
}
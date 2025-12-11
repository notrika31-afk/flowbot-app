import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth"; // הפונקציה שלך מהספרייה
import { cookies } from "next/headers";

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

    /* 2. אימות משתמש (Mock DB Check)
       במערכת אמיתית: כאן תהיה שליפה מ-Prisma/Mongoose והשוואת Hash של הסיסמה.
       כרגע: נגדיר משתמש קבוע לבדיקות כדי שהלוגין יעבוד.
    */
    const MOCK_USER = {
      email: "admin@flowbot.co",
      password: "123", // סיסמה לדוגמה
      id: "user_real_db_123",
      role: "ADMIN" as const
    };

    // בדיקה אם המשתמש שהוזן תואם למשתמש הדמה
    // (או תאפשר כל כניסה אם אתה רוצה רק לבדוק את ה-UI, אבל עדיף ככה)
    if (email !== MOCK_USER.email || password !== MOCK_USER.password) {
      return NextResponse.json(
        { error: "אימייל או סיסמה שגויים" },
        { status: 401 }
      );
    }

    // 3. יצירת טוקן באמצעות הספרייה שלך
    // חשוב: זה יזרוק שגיאה אם אין JWT_SECRET ב-.env
    const token = signToken({
      userId: MOCK_USER.id,
      role: MOCK_USER.role,
    });

    // 4. הגדרת הקוקי בדפדפן
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ימים
      sameSite: "lax",
    });

    return NextResponse.json({ success: true });

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
      { error: "שגיאת שרת פנימית" },
      { status: 500 }
    );
  }
}

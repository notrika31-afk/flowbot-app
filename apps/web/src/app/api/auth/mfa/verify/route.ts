// /api/auth/mfa/verify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";

// התיקון הקריטי: הכרחת סביבת Node.js לטובת ספריות כמו rate-limit ו-getClientIp
export const runtime = "nodejs";

export async function POST(req: Request) {
  // נחזיר את הייבוא להיות סטנדרטי, כי runtime = "nodejs" אמור לפתור את הבעיה
  const { rateLimit } = await import("@/lib/rate-limit");
  const { getClientIp } = await import("@/lib/request-ip");
  
  try {
    const ip = getClientIp(req);

    // הגבלת ניסיונות הקלדת קוד
    const limit = rateLimit({
      key: `mfa-verify:${ip}`,
      limit: 10,                // עד 10 ניסיונות ב-10 דקות
      windowMs: 10 * 60 * 1000,
    });

    if (!limit.ok) {
      return NextResponse.json(
        {
          error: "יותר מדי ניסיונות אימות",
          message: "בוצעו יותר מדי ניסיונות להזין קוד. נסה שוב מאוחר יותר.",
        },
        { status: 429 }
      );
    }

    const { userId, code } = await req.json().catch(() => ({})); // ה-await כבר קיים כאן!

    if (!userId || !code) {
      return NextResponse.json(
        { error: "חסר userId או code" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
      },
    });

    if (!user || !user.mfaEnabled) {
      return NextResponse.json(
        { error: "לא ניתן לאמת קוד עבור משתמש זה" },
        { status: 400 }
      );
    }

    // מאתרים את הקוד האחרון שטרם פג תוקף
    const mfaEntry = await prisma.mfaCode.findFirst({
      where: {
        userId: user.id,
        code: code.toString(),
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!mfaEntry) {
      // לא נגיד אם פג תוקף או לא נכון – הודעה אחידה
      return NextResponse.json(
        { error: "קוד אימות שגוי או שפג תוקפו" },
        { status: 401 }
      );
    }

    // הצלחה – מוחקים את כל הקודים הפעילים למשתמש
    await prisma.mfaCode.deleteMany({
      where: { userId: user.id },
    });

    // יצירת JWT
    const token = signToken({
      userId: user.id,
      session: `sess_${Date.now()}`,
      mfa: true,
    } as any);

    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json(
      {
        message: "אומתת בהצלחה ✅",
        user: { id: user.id, email: user.email },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("MFA VERIFY ERROR:", err);
    return NextResponse.json(
      { error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
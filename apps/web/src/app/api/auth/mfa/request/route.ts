// /api/auth/mfa/request/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// @ts-ignore - משתמשים ב-require כדי לעקוף בעיות ייבוא ב-Build time
const { rateLimit } = require("@/lib/rate-limit");
const { getClientIp } = require("@/lib/request-ip");
import { sendWhatsappMfaCode } from "@/lib/whatsapp/send";

// הערה: Next.js כופה את השימוש ב-Node.js Runtime בגלל שימוש בקבצי lib ו-IP.
// אם ה-Build עדיין נכשל, ייתכן שצריך להוסיף export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const limit = rateLimit({
      key: `mfa-request:${ip}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (!limit.ok) {
      return NextResponse.json(
        {
          error: "יותר מדי בקשות קוד",
          message: "בוצעו יותר מדי בקשות לקוד אימות. נסה שוב מאוחר יותר.",
        },
        { status: 429 }
      );
    }

    const { userId } = await req.json().catch(() => ({}));

    if (!userId) {
      return NextResponse.json(
        { error: "חסר מזהה משתמש (userId)" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, mfaEnabled: true },
    });

    if (!user || !user.mfaEnabled) {
      return NextResponse.json(
        { error: "לא ניתן לבקש קוד עבור משתמש זה" },
        { status: 400 }
      );
    }

    await prisma.mfaCode.deleteMany({ where: { userId } });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.mfaCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // === שליחת הודעה לוואטסאפ ===
    let sent = false;
    // ודא ש-user.phone הוא בפורמט בינלאומי תקין
    if (user.phone) {
      // הפונקציה sendWhatsappMfaCode היא אסינכרונית וחייבת await
      sent = await sendWhatsappMfaCode(user.phone, code);
    }

    return NextResponse.json(
      {
        message: sent
          ? "הקוד נשלח לוואטסאפ 📲"
          : "הקוד נוצר (לא נשלח — חסר מספר טלפון)",
        userId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("MFA REQUEST ERROR:", err);
    return NextResponse.json(
      { error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}
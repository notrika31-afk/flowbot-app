// apps/web/src/app/api/whatsapp/connect/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromToken } from "@/lib/auth";
import { env } from "@/lib/config/env";

export async function POST(req: Request) {
  try {
    const authUser = getAuthUserFromToken();

    if (!authUser) {
      return NextResponse.json(
        { error: "לא מחובר" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { phone, plan, botId } = body as {
      phone?: string;
      plan?: "basic" | "pro" | "scale";
      botId?: string | null;
    };

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "חסר מספר וואטסאפ" },
        { status: 400 }
      );
    }

    if (!plan || !["basic", "pro", "scale"].includes(plan)) {
      return NextResponse.json(
        { error: "מסלול לא תקין" },
        { status: 400 }
      );
    }

    // ולידציה בסיסית לטלפון (לא מושלם, אבל מונע שטויות לגמרי)
    const cleaned = phone.replace(/\s+/g, "");
    if (!cleaned.startsWith("+") || cleaned.length < 9) {
      return NextResponse.json(
        { error: "מספר וואטסאפ לא נראה תקין, ודא שיש קידומת +972..." },
        { status: 400 }
      );
    }

    // אם יש botId – נוודא שהבוט שייך למשתמש
    let bot = null;
    if (botId) {
      bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          ownerId: authUser.id,
        },
        select: { id: true },
      });

      if (!bot) {
        return NextResponse.json(
          { error: "הבוט לא נמצא או לא שייך אליך" },
          { status: 403 }
        );
      }
    }

    // נוודא שיש לנו verify secret (ל־webhook) – אם אין, נשים ערך dev
    const webhookSecret =
      env.WHATSAPP_WEBHOOK_SECRET || "dev-webhook-secret-change-me";

    // בודקים אם כבר יש חיבור לוואטסאפ עבור המשתמש+בוט הזה
    const existing = await prisma.whatsAppConnection.findFirst({
      where: {
        userId: authUser.id,
        botId: botId ?? null,
      },
    });

    let connection;

    if (existing) {
      connection = await prisma.whatsAppConnection.update({
        where: { id: existing.id },
        data: {
          phoneNumberId: cleaned,
          // בשלב זה אנחנו עדיין ב-"PENDING" – אין חיבור אמיתי דרך Meta
          wabaId: existing.wabaId || "PENDING",
          accessToken: existing.accessToken || "PENDING",
          verifyToken: existing.verifyToken || webhookSecret,
          isActive: false,
        },
      });
    } else {
      connection = await prisma.whatsAppConnection.create({
        data: {
          userId: authUser.id,
          botId: botId ?? null,
          phoneNumberId: cleaned,
          wabaId: "PENDING",          // כאן בעתיד תעדכן מזהה אמיתי מ-Meta / ספק
          accessToken: "PENDING",     // כאן אתה תכניס את הטוקן האמיתי אחרי onboarding
          verifyToken: webhookSecret,
          isActive: false,
        },
      });
    }

    return NextResponse.json(
      {
        status: "pending",
        message:
          "שמנו את מספר הוואטסאפ והמסלול שלך במערכת. אחרי חיבור לספק הוואטסאפ העסקי, הבוט יוכל להיות פעיל.",
        connectionId: connection.id,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("WHATSAPP CONNECT ERROR:", err);
    return NextResponse.json(
      { error: "שגיאת שרת בחיבור וואטסאפ" },
      { status: 500 }
    );
  }
}
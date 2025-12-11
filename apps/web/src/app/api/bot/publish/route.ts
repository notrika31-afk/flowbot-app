import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; // וודא שהנתיב הזה נכון אצלך

export async function POST(req: Request) {
  try {
    // 1. זיהוי המשתמש
    const session = await getUserSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { flow, waba, status } = body;

    if (!waba || !waba.phoneId || !waba.token) {
      return NextResponse.json({ error: "Missing WhatsApp credentials" }, { status: 400 });
    }

    console.log("🚀 Publishing Bot for user:", session.userId);

    // 2. שמירת/עדכון הבוט (התסריט)
    // אנחנו משתמשים ב-upsert כדי ליצור אם לא קיים, או לעדכן אם קיים
    // הנחה: לכל משתמש יש בוט אחד ראשי כרגע, או שאנחנו יוצרים חדש
    
    // בדיקה אם למשתמש כבר יש בוט
    let bot = await prisma.bot.findFirst({
        where: { userId: session.userId }
    });

    if (bot) {
        // עדכון בוט קיים
        bot = await prisma.bot.update({
            where: { id: bot.id },
            data: {
                flowData: flow, // ה-JSON של התסריט
                publishedAt: new Date(),
                status: status || 'ACTIVE'
            }
        });
    } else {
        // יצירת בוט חדש
        bot = await prisma.bot.create({
            data: {
                userId: session.userId,
                name: "My Business Bot",
                flowData: flow,
                status: status || 'ACTIVE',
                publishedAt: new Date()
            }
        });
    }

    // 3. שמירת חיבור הוואטסאפ (WABA)
    // אנחנו מקשרים את המספר לבוט הזה
    const existingConnection = await prisma.whatsAppConnection.findFirst({
        where: { userId: session.userId, phoneNumberId: waba.phoneId }
    });

    if (existingConnection) {
        await prisma.whatsAppConnection.update({
            where: { id: existingConnection.id },
            data: {
                wabaId: waba.wabaId,
                accessToken: waba.token,
                isActive: true,
                botId: bot.id // חיבור לבוט הספציפי
            }
        });
    } else {
        await prisma.whatsAppConnection.create({
            data: {
                userId: session.userId,
                phoneNumberId: waba.phoneId,
                wabaId: waba.wabaId,
                accessToken: waba.token,
                isActive: true,
                botId: bot.id
            }
        });
    }

    console.log("✅ Bot Published Successfully!");

    return NextResponse.json({ success: true, botId: bot.id }, { status: 200 });

  } catch (error: any) {
    console.error("Publish API Error:", error);
    return NextResponse.json({ error: "Server Error", details: error.message }, { status: 500 });
  }
}
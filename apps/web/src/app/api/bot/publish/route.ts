import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; 

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.id; 
    const body = await req.json();
    
    // שליפת הנתונים - הוספתי botId כדי לזהות בוט ספציפי אם נשלח
    const { flow, waba, status, botId } = body;

    console.log("🚀 Publishing Bot for user:", userId);

    // 1. זיהוי הבוט הנכון לעדכון
    let bot;
    if (botId) {
        bot = await prisma.bot.findUnique({ where: { id: botId, ownerId: userId } });
    } else {
        // אם לא נשלח ID, ניקח את הבוט האחרון שעודכן (Fallback)
        bot = await prisma.bot.findFirst({
            where: { ownerId: userId },
            orderBy: { updatedAt: 'desc' }
        });
    }

    if (bot) {
        // --- הגנה קריטית: עדכון בוט קיים ---
        bot = await prisma.bot.update({
            where: { id: bot.id },
            data: {
                // ✅ שינוי: אם flow ריק, אל תדרוס! השתמש במידע הקיים ב-DB
                flowData: flow ? flow : bot.flowData, 
                publishedAt: new Date(),
                status: status || 'ACTIVE'
            }
        });
        console.log("📝 Updated existing bot:", bot.id);
    } else {
        // יצירת בוט חדש (רק אם באמת אין כלום)
        if (!flow) {
             return NextResponse.json({ error: "Cannot create a new bot without flow data." }, { status: 400 });
        }
        bot = await prisma.bot.create({
            data: {
                ownerId: userId,
                name: "My Business Bot",
                flowData: flow,
                status: status || 'ACTIVE',
                publishedAt: new Date()
            }
        });
        console.log("✨ Created new bot:", bot.id);
    }

    // 2. טיפול בחיבור הוואטסאפ (WABA)
    if (waba && waba.phoneId && waba.token) {
        // תרחיש A: פרטים ידניים
        await prisma.wabaConnection.upsert({
            where: { userId: userId },
            update: {
                wabaId: waba.wabaId,
                accessToken: waba.token,
                phoneNumberId: waba.phoneId,
                isActive: true,
                botId: bot.id 
            },
            create: {
                userId: userId,
                phoneNumberId: waba.phoneId,
                wabaId: waba.wabaId,
                accessToken: waba.token,
                isActive: true,
                botId: bot.id,
                verifyToken: "flowbot_verify_token"
            }
        });
    } else {
        // תרחיש B: חיבור אוטומטי (פייסבוק)
        const existingConnection = await prisma.wabaConnection.findFirst({
            where: { userId: userId },
            orderBy: { updatedAt: 'desc' }
        });

        if (!existingConnection) {
            return NextResponse.json({ error: "No WhatsApp connection found." }, { status: 400 });
        }

        await prisma.wabaConnection.update({
            where: { id: existingConnection.id },
            data: {
                botId: bot.id,
                isActive: true
            }
        });
    }

    return NextResponse.json({ success: true, botId: bot.id }, { status: 200 });

  } catch (error: any) {
    console.error("Publish Error:", error);
    return NextResponse.json({ error: "Server Error", details: error.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; 

// ==============================================================================
// תיקון קריטי לשגיאת Build:
// הגדרות אלו מונעות מ-Next.js לנסות להריץ את הקוד בזמן הבנייה
// ומחייבות שימוש בסביבת Node.js יציבה עבור Prisma.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// ==============================================================================

export async function POST(req: Request) {
  try {
    // 1. זיהוי המשתמש
    const session = await getUserSession();
    
    // בדיקה מול .id ולא .userId (כפי שביקשת)
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.id; // שומרים במשתנה נוח לשימוש

    const body = await req.json();
    const { flow, waba, status } = body;

    if (!waba || !waba.phoneId || !waba.token) {
      return NextResponse.json({ error: "Missing WhatsApp credentials" }, { status: 400 });
    }

    console.log("🚀 Publishing Bot for user:", userId);

    // 2. שמירת/עדכון הבוט (התסריט)
    
    // שימוש ב-ownerId לפי הסכמה
    let bot = await prisma.bot.findFirst({
        where: { ownerId: userId }
    });

    if (bot) {
        // עדכון בוט קיים
        bot = await prisma.bot.update({
            where: { id: bot.id },
            data: {
                flowData: flow, 
                publishedAt: new Date(),
                status: status || 'ACTIVE'
            }
        });
    } else {
        // יצירת בוט חדש
        bot = await prisma.bot.create({
            data: {
                ownerId: userId,
                name: "My Business Bot",
                flowData: flow,
                status: status || 'ACTIVE',
                publishedAt: new Date()
            }
        });
    }

    // 3. שמירת חיבור הוואטסאפ (WABA)
    const existingConnection = await prisma.whatsAppConnection.findFirst({
        where: { userId: userId, phoneNumberId: waba.phoneId }
    });

    if (existingConnection) {
        await prisma.whatsAppConnection.update({
            where: { id: existingConnection.id },
            data: {
                wabaId: waba.wabaId,
                accessToken: waba.token,
                isActive: true,
                botId: bot.id 
            }
        });
    } else {
        await prisma.whatsAppConnection.create({
            data: {
                userId: userId,
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

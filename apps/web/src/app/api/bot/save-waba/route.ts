import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser || !sessionUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { flow, waba } = body as { flow: any, waba: { phoneId: string, wabaId: string, token: string } };

    if (!flow || !waba) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // === 1. Self-Healing: לוודא שהמשתמש קיים (כדי למנוע שגיאות Foreign Key) ===
    let dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { id: sessionUser.id, email: sessionUser.email || `restored_${Date.now()}@flowbot.local`, name: "Restored User" },
      });
    }

    // 2. מציאת/יצירת הבוט הראשי
    let bot = await prisma.bot.findFirst({
      where: { ownerId: dbUser.id },
    });

    if (!bot) {
      bot = await prisma.bot.create({
        data: { ownerId: dbUser.id, name: "My First Bot", status: "DRAFT" },
      });
    }

    // 3. שמירת התסריט הסופי (Flow)
    // FIX: מחליפים את upsert הבעייתי ב-findFirst ואז update/create
    const existingFlow = await prisma.flow.findFirst({
      where: { botId: bot.id }, // מחפשים כל Flow קיים עבור הבוט הזה
      orderBy: { createdAt: 'asc' }
    });

    if (existingFlow) {
      // עדכון קיים
      await prisma.flow.update({
        where: { id: existingFlow.id }, // משתמשים ב-ID הייחודי של ה-Flow
        data: {
          nodes: flow, // שמירת ה-JSON
          isPublished: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // יצירה חדשה
      await prisma.flow.create({
        data: {
          botId: bot.id,
          name: flow.goal || "תסריט ראשי",
          nodes: flow,
          isPublished: true,
        },
      });
    }
    
    // 4. שמירת פרטי חיבור ה-WABA
    // גם כאן נחליף את ה-upsert כדי שיהיה בטוח
    const existingWaba = await prisma.wabaConnection.findFirst({
        where: { botId: bot.id }
    });

    if (existingWaba) {
        await prisma.wabaConnection.update({
            where: { id: existingWaba.id },
            data: {
                wabaId: waba.wabaId,
                phoneNumberId: waba.phoneId,
                accessToken: waba.token,
                isActive: true,
                updatedAt: new Date(),
            }
        });
    } else {
         await prisma.wabaConnection.create({
            data: {
                userId: dbUser.id,
                botId: bot.id,
                wabaId: waba.wabaId,
                phoneNumberId: waba.phoneId,
                accessToken: waba.token,
                verifyToken: 'FLOWBOT_' + Math.random().toString(36).substring(2, 10),
                isActive: true,
            }
        });
    }


    return NextResponse.json({ success: true, message: "הבוט והחיבור נשמרו בהצלחה!" });

  } catch (error: any) {
    console.error('Save WABA Error:', error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
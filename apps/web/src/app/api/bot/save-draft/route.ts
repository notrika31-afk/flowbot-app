import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. קבלת המשתמש מהעוגייה
    const sessionUser = await getUserSession();
    
    if (!sessionUser || !sessionUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. קבלת ה-JSON של הבוט
    const body = await req.json();
    const { flow } = body;

    if (!flow) {
      return NextResponse.json({ error: "Missing flow data" }, { status: 400 });
    }

    // === התיקון הקריטי (Self-Healing) ===
    // בדיקה: האם המשתמש באמת קיים בטבלת User?
    let dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    // אם המשתמש לא קיים (בגלל איפוס DB), ניצור אותו עכשיו כדי למנוע את השגיאה
    if (!dbUser) {
      console.log(`User ${sessionUser.id} missing in DB. Recreating...`);
      dbUser = await prisma.user.create({
        data: {
          id: sessionUser.id, // משתמשים באותו ID מהעוגייה כדי שהכל יסתנכרן
          email: sessionUser.email || `restored_${Date.now()}@flowbot.local`,
          name: "User Restored",
        },
      });
    }
    // === סוף התיקון ===

    // 3. עכשיו בטוח אפשר לחפש/ליצור את הבוט
    let bot = await prisma.bot.findFirst({
      where: { ownerId: dbUser.id },
    });

    if (!bot) {
      bot = await prisma.bot.create({
        data: {
          ownerId: dbUser.id,
          name: "הבוט שלי",
          status: "DRAFT",
        },
      });
    }

    // 4. שמירת התסריט (Flow)
    const existingFlow = await prisma.flow.findFirst({
      where: {
        botId: bot.id,
        // הסרנו את status מהחיפוש כדי להיות בטוחים שנמצא משהו
      },
    });

    if (existingFlow) {
      // עדכון
      await prisma.flow.update({
        where: { id: existingFlow.id },
        data: {
          nodes: flow, // ה-JSON נכנס לכאן
          updatedAt: new Date(),
        },
      });
    } else {
      // יצירה חדשה
      await prisma.flow.create({
        data: {
          botId: bot.id,
          name: "טיוטה ראשית",
          nodes: flow,
          isPublished: false,
        },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Save Draft Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
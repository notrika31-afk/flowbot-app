import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; 

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // התיקון: הוספנו await כי הפונקציה מחזירה Promise
    const user = await getUserSession();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bots = await prisma.bot.findMany({
      where: { ownerId: user.id },
      include: {
        messages: {
          select: { id: true },
        },
        connections: true, 
      },
      orderBy: { updatedAt: 'desc' }
    });

    // הופכים את המידע למבנה שהפרונט צריך (כולל ספירת הודעות)
    const formattedBots = bots.map((bot) => ({
      ...bot,
      stats: {
        messages: bot.messages.length,
      }
    }));

    return NextResponse.json({ success: true, data: formattedBots });
  } catch (error) {
    console.error("List Bots Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
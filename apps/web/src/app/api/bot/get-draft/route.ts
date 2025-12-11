import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // שליפת הבוט (ללא סינון לפי status בשלב זה, ליתר ביטחון)
    const bot = await prisma.bot.findFirst({
      where: {
        ownerId: user.id,
      },
      include: {
        flows: {
          // אנחנו מנסים למצוא טיוטה. אם אין שדה status ב-Flow, זה ייכשל.
          // אבל ב-schema החדש הוספנו אותו, אז זה יעבוד.
          where: { 
             // אם השגיאה ממשיכה, מחק את השורה הזו זמנית:
             // status: "DRAFT" 
          }, 
          take: 1,
          orderBy: { updatedAt: "desc" }
        }
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!bot || !bot.flows || bot.flows.length === 0) {
      return NextResponse.json({ 
        hasDraft: false, 
        botId: bot?.id || null,
        flow: null 
      });
    }

    const draftFlow = bot.flows[0];
    
    return NextResponse.json({
      hasDraft: true,
      botId: bot.id,
      flow: draftFlow.nodes, // ודא שזה תואם לשם ב-Schema (nodes/content)
    });

  } catch (error) {
    console.error("GET Draft Error:", error);
    return NextResponse.json(
      { hasDraft: false, error: "Database error" },
      { status: 500 }
    );
  }
}
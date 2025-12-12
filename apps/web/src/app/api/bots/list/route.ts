import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // התיקון: הוספנו await כאן
    const user = await getAuthUserFromToken();

    if (!user) {
      return NextResponse.json(
        { error: "לא מחובר" },
        { status: 401 }
      );
    }

    const bots = await prisma.bot.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,

        messages: { select: { id: true } },
        
        // הערה: אם הסכמה שלך לא מכילה 'flows' או 'whatsappConnections',
        // זה עלול ליפול בשלב הבא. אם כן - נתקן את שמות השדות.
        // כרגע השארתי את זה כמו ששלחת, בהנחה שזה תואם לסכמה שלך.
        flows: { select: { id: true } },

        whatsappConnections: {
          select: {
            id: true,
            isActive: true,
            phoneNumberId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = bots.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      createdAt: b.createdAt,

      messagesCount: b.messages.length,
      // @ts-ignore - הגנה למקרה שאין flows
      flowsCount: b.flows?.length || 0,

      // @ts-ignore - הגנה למקרה שאין whatsappConnections
      whatsapp: b.whatsappConnections?.map((w) => ({
        id: w.id,
        active: w.isActive,
        phoneNumberId: w.phoneNumberId,
      })) || [],
    }));

    return NextResponse.json({ bots: formatted });
  } catch (err) {
    console.error("BOT LIST ERROR:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
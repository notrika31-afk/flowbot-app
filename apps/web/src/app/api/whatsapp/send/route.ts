import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromToken } from "@/lib/auth";
import { env } from "@/lib/config/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// נתמך כרגע: הודעת טקסט
type SendBody = {
  botId: string;
  to: string;
  message: string;
  text?: string;        // הוספת תמיכה בשדה מה-Frontend
  accessToken?: string; // הוספת תמיכה בשדה מה-Frontend
  phoneId?: string;     // הוספת תמיכה בשדה מה-Frontend
};

export async function POST(req: Request) {
  try {
    const user = await getAuthUserFromToken();
    
    if (!user) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = (await req.json()) as SendBody;
    const { botId, to } = body;
    
    // סנכרון שמות: משתמשים ב-message או ב-text (מה שקיים)
    const finalMessage = body.message || body.text;

    // בדיקה גמישה: מאפשרים שליחה אם יש botId או אם יש נתוני חיבור ישירים (Review Mode)
    if (!to || !finalMessage || (!botId && (!body.accessToken || !body.phoneId))) {
      return NextResponse.json(
        { error: "Missing fields", details: { to: !!to, msg: !!finalMessage, bot: !!botId } },
        { status: 400 }
      );
    }

    let phoneNumberId = body.phoneId;
    let accessToken = body.accessToken;

    // אם קיבלנו botId, נשלוף מהמסד כרגיל
    if (botId) {
        const bot = await prisma.bot.findFirst({
          where: { id: botId, ownerId: user.id },
          select: { id: true },
        });

        if (!bot) {
          return NextResponse.json({ error: "אין גישה לבוט הזה" }, { status: 403 });
        }

        const connection = await prisma.whatsAppConnection.findFirst({
          where: { botId: botId, isActive: true },
          select: { phoneNumberId: true, accessToken: true },
        });

        if (connection) {
            phoneNumberId = connection.phoneNumberId;
            accessToken = connection.accessToken;
        }
    }

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({ error: "אין חיבור וואטסאפ פעיל" }, { status: 400 });
    }

    // בניית הקריאה ל-Meta
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const metaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.toString().replace(/\D/g, ''), // ניקוי מספר
      type: "text",
      text: { body: finalMessage },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("WHATSAPP SEND ERROR:", result);
      return NextResponse.json({ error: "WhatsApp send failed", details: result }, { status: 500 });
    }

    // שמירה במסד רק אם יש botId תקין
    if (botId) {
        await prisma.message.create({
          data: {
            botId,
            userId: user.id,
            fromPhone: null,
            toPhone: to,
            direction: "outbound",
            content: finalMessage,
          },
        });
    }

    return NextResponse.json({ status: "sent", meta: result });
  } catch (err) {
    console.error("SEND ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
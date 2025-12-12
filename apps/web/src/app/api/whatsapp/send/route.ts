// apps/web/src/app/api/whatsapp/send/route.ts
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
};

export async function POST(req: Request) {
  try {
    // התיקון: הוספת await
    const user = await getAuthUserFromToken();
    
    if (!user) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { botId, to, message } = (await req.json()) as SendBody;

    if (!botId || !to || !message) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    // בדיקה שהבוט שייך למשתמש (עכשיו user.id יעבוד תקין)
    const bot = await prisma.bot.findFirst({
      where: { id: botId, ownerId: user.id },
      select: { id: true },
    });

    if (!bot) {
      return NextResponse.json(
        { error: "אין גישה לבוט הזה" },
        { status: 403 }
      );
    }

    // שליפת חיבור הוואטסאפ של הבוט
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        botId: botId,
        isActive: true,
      },
      select: {
        phoneNumberId: true,
        accessToken: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "אין חיבור וואטסאפ פעיל לבוט הזה" },
        { status: 400 }
      );
    }

    const { phoneNumberId, accessToken } = connection;

    // בניית הקריאה ל-Meta (או ספק תואם)
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const metaPayload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
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
      return NextResponse.json(
        { error: "WhatsApp send failed", details: result },
        { status: 500 }
      );
    }

    // שומרים גם במסד
    await prisma.message.create({
      data: {
        botId,
        userId: user.id,
        fromPhone: null, // outgoing
        toPhone: to,
        direction: "outbound",
        content: message,
      },
    });

    return NextResponse.json({ status: "sent", meta: result });
  } catch (err) {
    console.error("SEND ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
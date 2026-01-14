import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// פונקציית עזר לשליחה למטא
async function sendDirectWhatsApp(phoneId: string, token: string, to: string, text: string) {
  return fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text },
    }),
  });
}

// פונקציות עזר לגוגל (קלנדר ושיטס)
async function createGoogleCalendarEvent(accessToken: string, eventData: any) {
  const { date, time, name, service } = eventData;
  const startDateTime = `${date}T${time}:00Z`;
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `${service}: ${name}`,
      start: { dateTime: startDateTime },
      end: { dateTime: new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString() },
    }),
  });
}

async function appendGoogleSheetsRow(accessToken: string, sheetData: any) {
  const { spreadsheetId, values } = sheetData;
  return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [values] }),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const businessPhoneId = value?.metadata?.phone_number_id;

    if (!message || !businessPhoneId) {
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    // 1. שליפת החיבור והבוט
    const connection = await prisma.wabaConnection.findFirst({
      where: { phoneNumberId: businessPhoneId },
      include: { bot: true }
    });

    if (!connection || !connection.bot) return new NextResponse("NO_CONNECTION", { status: 200 });

    const userPhone = message.from;
    const incomingText = message.text?.body;

    // 2. שמירת ההודעה הנכנסת ב-DB (כדי שיהיה זיכרון)
    await prisma.message.create({
      data: {
        content: incomingText,
        role: "user",
        conversationId: userPhone,
        botId: connection.botId
      }
    });

    // 3. שליפת היסטוריית השיחה (5 הודעות אחרונות)
    const history = await prisma.message.findMany({
      where: { conversationId: userPhone },
      orderBy: { createdAt: "asc" },
      take: 6
    });

    // 4. פנייה ל-AI עם ההיסטוריה המלאה
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`;
    const aiResponse = await fetch(`${baseUrl}/api/ai/engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: incomingText,
        history: history.map(h => ({ role: h.role, content: h.content })),
        phase: "simulate",
        existingFlow: connection.bot.flowData,
        userId: connection.userId,
      }),
    });

    const aiData = await aiResponse.json();
    let finalReply = aiData.reply;

    if (!finalReply) return new NextResponse("AI_ERROR", { status: 200 });

    // 5. בדיקת אינטגרציות וביצוע פקודות (גוגל)
    const googleInteg = await prisma.integrationConnection.findFirst({
      where: { userId: connection.userId, provider: "google" }
    });

    if (googleInteg?.accessToken) {
      const calendarMatch = finalReply.match(/\[CREATE_CALENDAR_EVENT: (.*?)\]/);
      if (calendarMatch) {
        await createGoogleCalendarEvent(googleInteg.accessToken, JSON.parse(calendarMatch[1]));
        finalReply = finalReply.replace(/\[CREATE_CALENDAR_EVENT:.*?\]/, "").trim();
      }
      const sheetsMatch = finalReply.match(/\[CREATE_SHEETS_ROW: (.*?)\]/);
      if (sheetsMatch) {
        await appendGoogleSheetsRow(googleInteg.accessToken, JSON.parse(sheetsMatch[1]));
        finalReply = finalReply.replace(/\[CREATE_SHEETS_ROW:.*?\]/, "").trim();
      }
    }

    // 6. שמירת תגובת הבוט ב-DB
    await prisma.message.create({
      data: {
        content: finalReply,
        role: "assistant",
        conversationId: userPhone,
        botId: connection.botId
      }
    });

    // 7. שליחה למטא
    await sendDirectWhatsApp(connection.phoneNumberId as string, connection.accessToken as string, userPhone, finalReply);

    return new NextResponse("SUCCESS", { status: 200 });

  } catch (error) {
    console.error("🔥 Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === "flowbot_verify_2026") return new NextResponse(challenge, { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}
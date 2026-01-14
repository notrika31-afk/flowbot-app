import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// פונקציות עזר לשליחה למטא, גוגל קלנדר וגוגל שיטס (נשארות כפי שהיו)
async function sendDirectWhatsApp(phoneId: string, token: string, to: string, text: string) {
  return fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
}

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

    if (!message || !businessPhoneId) return new NextResponse("EVENT_RECEIVED", { status: 200 });

    // 1. שליפת החיבור והבוט
    const connection = await prisma.wabaConnection.findFirst({
      where: { phoneNumberId: businessPhoneId },
      include: { bot: true }
    });

    if (!connection || !connection.bot) return new NextResponse("NO_CONNECTION", { status: 200 });

    // 2. בדיקה אילו אינטגרציות הלקוח חיבר (החלק החדש!)
    const activeIntegrations = await prisma.integrationConnection.findMany({
      where: { userId: connection.userId }
    });

    // יצירת רשימה של הכלים הזמינים עבור ה-AI
    const availableTools = activeIntegrations.map(integ => integ.provider); 

    // 3. פנייה ל-AI עם רשימת הכלים הזמינים
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`;
    const aiResponse = await fetch(`${baseUrl}/api/ai/engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message.text?.body,
        phase: "simulate",
        existingFlow: connection.bot.flowData,
        userId: connection.userId,
        availableIntegrations: availableTools // ה-AI עכשיו יודע מה מחובר!
      }),
    });

    const aiData = await aiResponse.json();
    let finalReply = aiData.reply;

    // 4. ביצוע פעולות רק אם האינטגרציה קיימת
    const googleInteg = activeIntegrations.find(i => i.provider === 'google');
    
    if (googleInteg?.accessToken) {
      // ביצוע קלנדר אם הבוט החליט
      const calendarMatch = finalReply.match(/\[CREATE_CALENDAR_EVENT: (.*?)\]/);
      if (calendarMatch) {
        await createGoogleCalendarEvent(googleInteg.accessToken, JSON.parse(calendarMatch[1]));
        finalReply = finalReply.replace(/\[CREATE_CALENDAR_EVENT:.*?\]/, "").trim();
      }

      // ביצוע שיטס אם הבוט החליט
      const sheetsMatch = finalReply.match(/\[CREATE_SHEETS_ROW: (.*?)\]/);
      if (sheetsMatch) {
        await appendGoogleSheetsRow(googleInteg.accessToken, JSON.parse(sheetsMatch[1]));
        finalReply = finalReply.replace(/\[CREATE_SHEETS_ROW:.*?\]/, "").trim();
      }
    }

    await sendDirectWhatsApp(connection.phoneNumberId as string, connection.accessToken as string, message.from, finalReply);

    return new NextResponse("SUCCESS", { status: 200 });

  } catch (error) {
    console.error("🔥 Error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}
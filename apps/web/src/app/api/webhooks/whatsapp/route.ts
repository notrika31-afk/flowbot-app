import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// --- פונקציות עזר לשליחה ואינטגרציות ---

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

async function createGoogleCalendarEvent(accessToken: string, eventData: any) {
  const { date, time, name, service, start_time, summary } = eventData;
  // תמיכה גם בפורמט הישן וגם בפורמט ISO שה-AI החדש שולח
  const startDateTime = start_time || `${date}T${time}:00Z`;
  const eventSummary = summary || `${service}: ${name}`;
  
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: eventSummary,
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

// --- הלוגיקה המרכזית (POST) ---

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
    const incomingText = message.text?.body || "";

    // 2. ניהול איש קשר (Contact) - חובה לפי ה-Schema שלך
    const contact = await prisma.contact.upsert({
      where: {
        botId_phone: {
          botId: connection.botId!,
          phone: userPhone,
        },
      },
      update: {
        name: value?.contacts?.[0]?.profile?.name || "WhatsApp User"
      },
      create: {
        botId: connection.botId!,
        phone: userPhone,
        name: value?.contacts?.[0]?.profile?.name || "WhatsApp User",
      },
    });

    // 3. שליפת היסטוריית השיחה - הגדלנו ל-12 הודעות לזיכרון טוב יותר בין ימים
    const pastMessages = await prisma.message.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: "asc" },
      take: 12
    });

    // 4. שמירת ההודעה הנכנסת (INCOMING, TEXT)
    await prisma.message.create({
      data: {
        content: incomingText,
        botId: connection.botId!,
        contactId: contact.id,
        direction: "INCOMING",
        type: "TEXT" 
      }
    });

    // 5. פנייה ל-AI Engine עם ההיסטוריה וההודעה הנוכחית
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`;
    
    // הוספת זמן נוכחי כדי שהבוט ידע להבדיל בין "היום" ל"אתמול"
    const timestamp = new Date().toISOString();

    const aiResponse = await fetch(`${baseUrl}/api/ai/engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: incomingText,
        history: pastMessages.map(h => ({ 
          role: h.direction === "INCOMING" ? "user" : "assistant", 
          content: h.content,
          timestamp: h.createdAt // הוספת זמן לכל הודעה בהיסטוריה
        })),
        phase: "simulate",
        existingFlow: connection.bot.flowData,
        userId: connection.userId,
        currentTime: timestamp
      }),
    });

    if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI Engine Error:", errorText);
        throw new Error(`AI Engine failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let finalReply = aiData.reply || aiData.message;

    if (!finalReply) return new NextResponse("AI_NO_REPLY", { status: 200 });

    // 6. בדיקת אינטגרציות גוגל (קלנדר ושיטס)
    const integrations = await prisma.integrationConnection.findMany({
      where: { userId: connection.userId }
    });

    const googleInteg = integrations.find(i => 
      ["GOOGLE", "GOOGLE_CALENDAR", "GOOGLE_SHEETS"].includes(i.provider)
    );

    if (googleInteg?.accessToken) {
      // ביצוע קלנדר אם יש פקודה (Regex תומך גם ב-Tool Calls אם הם מוחזרים כטקסט)
      const calendarMatch = finalReply.match(/\[CREATE_CALENDAR_EVENT: (.*?)\]/);
      if (calendarMatch) {
        try {
          await createGoogleCalendarEvent(googleInteg.accessToken, JSON.parse(calendarMatch[1]));
          finalReply = finalReply.replace(/\[CREATE_CALENDAR_EVENT:.*?\]/, "").trim();
        } catch (e) {
          console.error("Calendar Error:", e);
        }
      }

      // ביצוע שיטס אם יש פקודה
      const sheetsMatch = finalReply.match(/\[CREATE_SHEETS_ROW: (.*?)\]/);
      if (sheetsMatch) {
        try {
          await appendGoogleSheetsRow(googleInteg.accessToken, JSON.parse(sheetsMatch[1]));
          finalReply = finalReply.replace(/\[CREATE_SHEETS_ROW:.*?\]/, "").trim();
        } catch (e) {
          console.error("Sheets Error:", e);
        }
      }
    }

    // 7. שמירת תגובת הבוט ב-DB (OUTGOING)
    await prisma.message.create({
      data: {
        content: finalReply,
        botId: connection.botId!,
        contactId: contact.id,
        direction: "OUTGOING",
        type: "TEXT"
      }
    });

    // 8. שליחה למטא וואטסאפ
    await sendDirectWhatsApp(
      connection.phoneNumberId as string, 
      connection.accessToken as string, 
      userPhone, 
      finalReply
    );

    return new NextResponse("SUCCESS", { status: 200 });

  } catch (error) {
    console.error("🔥 Global Error:", error);
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
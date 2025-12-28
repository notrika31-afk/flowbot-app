import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = "flowbot_verify_token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("❌ Webhook verification failed. Token mismatch.");
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. חילוץ פרטי ההודעה והמספר של העסק
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const metadata = body.entry?.[0]?.changes?.[0]?.value?.metadata;
    const businessPhoneId = metadata?.phone_number_id;

    // אם זו לא הודעת טקסט מהמשתמש (למשל אישור מסירה), פשוט תתעלם
    if (!message || !message.text || !businessPhoneId) {
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    const customerPhone = message.from;
    const userText = message.text.body;

    console.log(`📩 הודעה מ-${customerPhone}: ${userText}`);

    // 2. שליפת פרטי העסק והמחירון מ-Prisma
    const connection = await prisma.wabaConnection.findFirst({
      where: { phoneNumberId: businessPhoneId },
      include: { 
        user: { 
          include: { bots: true } 
        } 
      }
    });

    if (!connection) {
      console.error("❌ לא נמצא חיבור למספר הזה ב-DB");
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    // 3. שליחת ההודעה ל"מוח" (AI Engine) שבנינו קודם
    // הערה: אנו קוראים ל-Engine הפנימי של האתר שלך
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`;
    const aiResponse = await fetch(`${baseUrl}/api/ai/engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        phase: "simulate", // מעביר את הבוט למצב סימולציה חכמה
        existingFlow: connection.user.bots[0]?.flowData,
        userId: connection.userId, // המנוע ישתמש בזה כדי לשלוף את המחירון
      }),
    });

    const aiData = await aiResponse.json();
    const replyText = aiData.reply;

    if (!replyText) {
      console.error("❌ ה-AI לא החזיר תשובה");
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    // 4. שליחת התשובה ללקוח בוואטסאפ דרך ה"דוור" (Send API)
    await fetch(`${baseUrl}/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: customerPhone,
        text: replyText,
        accessToken: connection.accessToken,
        phoneId: connection.phoneNumberId
      }),
    });

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Post Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
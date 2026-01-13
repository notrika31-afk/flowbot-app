import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// פונקציית עזר לשליחה ישירה למטא (חוסכת קריאה ל-API חיצוני)
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const businessPhoneId = value?.metadata?.phone_number_id;

    if (!message || !businessPhoneId) {
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    console.log(`📩 הודעה נכנסת מ-${message.from} עבור מספר מטא: ${businessPhoneId}`);

    // 1. שליפה מהירה מה-DB
    const connection = await prisma.wabaConnection.findFirst({
      where: { phoneNumberId: businessPhoneId },
      include: { bot: true }
    });

    if (!connection || !connection.bot) {
      console.error("❌ לא נמצא חיבור או בוט ב-DB למספר זה");
      return new NextResponse("NO_CONNECTION", { status: 200 });
    }

    // 2. פנייה למנוע ה-AI (כאן כדאי לייבא את הפונקציה ישירות במקום fetch אם אפשר)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`;
    const aiResponse = await fetch(`${baseUrl}/api/ai/engine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message.text?.body,
        phase: "simulate",
        existingFlow: connection.bot.flowData,
        userId: connection.userId,
      }),
    });

    const aiData = await aiResponse.json();
    
    if (!aiData.reply) {
      console.error("❌ ה-AI לא החזיר תשובה תקינה");
      return new NextResponse("AI_ERROR", { status: 200 });
    }

    // 3. שליחה ישירה למטא (בלי לעבור דרך /api/whatsapp/send)
    const sendRes = await sendDirectWhatsApp(
      connection.phoneNumberId as string,
      connection.accessToken as string,
      message.from,
      aiData.reply
    );

    if (!sendRes.ok) {
      const errorData = await sendRes.json();
      console.error("❌ שגיאה בשליחה למטא:", errorData);
    } else {
      console.log("✅ הודעה נשלחה בהצלחה למשתמש");
    }

    return new NextResponse("SUCCESS", { status: 200 });

  } catch (error) {
    console.error("🔥 Webhook Critical Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// חובה: הוספת ה-GET כדי שמטא יוכלו לאמת את ה-Webhook
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === "flowbot_verify_2026") {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}
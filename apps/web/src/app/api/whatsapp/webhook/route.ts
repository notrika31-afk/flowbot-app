import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/config/env";
import { sendWhatsAppText } from "@/lib/whatsapp"; // הייבוא החדש

export const runtime = "nodejs";

// --- שלב 1: אימות (GET) ---
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const expected = env.WHATSAPP_WEBHOOK_SECRET || "dev-webhook-secret";

    if (mode === "subscribe" && token === expected && challenge) {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "verification_failed" }, { status: 403 });
  } catch (err) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// --- שלב 2: הודעות נכנסות (POST) ---
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const payload = JSON.parse(raw);

    // חילוץ המידע הבסיסי
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const msg = messages[0];
    const from = msg.from; // המספר של הלקוח
    const textBody = msg.text?.body || ""; // מה הלקוח כתב
    const phoneNumberId = value?.metadata?.phone_number_id; // לאיזה עסק זה נשלח

    // 1. זיהוי העסק (הבוט)
    const connection = await prisma.whatsAppConnection.findFirst({
      where: { phoneNumberId: phoneNumberId },
      include: { 
          bot: true // אנו צריכים את המידע על הבוט (ה-Flow שלו)
      }
    });

    if (!connection || !connection.bot) {
      console.warn("⚠️ No bot connected for this phone number:", phoneNumberId);
      return NextResponse.json({ status: "no_bot" }, { status: 200 });
    }

    // 2. שמירת הודעת הלקוח בדאטה-בייס
    // (אופציונלי: כאן תוכל לשלוף היסטוריה אם תרצה שהבוט יזכור הקשר)
    await prisma.message.create({
      data: {
        botId: connection.botId!,
        userId: connection.userId,
        fromPhone: from,
        direction: "inbound",
        content: textBody,
      },
    });

    // 3. הפעלת המוח (AI Engine) 🧠
    // אנחנו שולחים בקשה פנימית ל-API של המנוע שבנינו
    const engineUrl = `${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/engine`;
    
    console.log("🤖 Asking AI Engine...");
    
    const aiRes = await fetch(engineUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: textBody,
            // אנו מעבירים את ה-Flow השמור של הבוט כדי שה-AI ידע איך להתנהג
            existingFlow: connection.bot.flowData, 
            phase: "simulate", // אומרים לבוט להתנהג כמו בוט אמיתי
            history: [] // (לשיפור עתידי: שלוף את 5 ההודעות האחרונות מה-DB)
        })
    });

    const aiData = await aiRes.json();
    const replyText = aiData.reply;

    if (replyText) {
        // 4. שליחת התשובה לוואטסאפ של הלקוח 🗣️
        console.log("✅ AI Replied:", replyText);
        
        await sendWhatsAppText({
            to: from,
            body: replyText,
            phoneNumberId: connection.phoneNumberId,
            accessToken: connection.accessToken || "" // חייב להיות שמור בחיבור
        });

        // שמירת תשובת הבוט ב-DB
        await prisma.message.create({
            data: {
                botId: connection.botId!,
                userId: connection.userId,
                fromPhone: from,
                direction: "outbound",
                content: replyText,
            },
        });
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });

  } catch (err) {
    console.error("🔥 WHATSAPP WEBHOOK ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
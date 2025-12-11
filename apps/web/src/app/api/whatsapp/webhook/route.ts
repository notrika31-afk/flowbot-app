import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/config/env";
// וודא שהקובץ הזה קיים אצלך! אם לא, תגיד לי ואשלח לך אותו.
import { sendWhatsAppText } from "@/lib/whatsapp"; 

export const runtime = "nodejs";

// --- שלב 1: אימות (GET) ---
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // שימוש בערך ברירת מחדל אם המשתנה לא קיים, למניעת קריסה
    const expected = env.WHATSAPP_WEBHOOK_SECRET || "dev-webhook-secret";

    if (mode === "subscribe" && token === expected && challenge) {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "verification_failed" }, { status: 403 });
  } catch (err) {
    console.error("Webhook GET Error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// --- שלב 2: הודעות נכנסות (POST) ---
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (!raw) return NextResponse.json({ status: "empty" }, { status: 200 });

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
          bot: true // אנו צריכים את המידע על הבוט
      }
    });

    // בדיקה קפדנית יותר
    if (!connection || !connection.bot || !connection.isActive) {
      console.warn(`⚠️ No active bot found for phone: ${phoneNumberId}`);
      return NextResponse.json({ status: "no_active_bot" }, { status: 200 });
    }

    // 2. שמירת הודעת הלקוח בדאטה-בייס
    await prisma.message.create({
      data: {
        botId: connection.bot.id, // שימוש ב-bot.id בטוח יותר מ-botId
        userId: connection.userId,
        fromPhone: from,
        direction: "inbound",
        content: textBody,
      },
    });

    // 3. הפעלת המוח (AI Engine) 🧠
    // התיקון כאן: שימוש במשתנה הנכון (BASE_URL)
    const baseUrl = env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const engineUrl = `${baseUrl}/api/ai/engine`;
    
    console.log("🤖 Asking AI Engine...");
    
    // שימוש ב-fetch פנימי
    const aiRes = await fetch(engineUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: textBody,
            // מעבירים את ה-Flow של הבוט
            existingFlow: connection.bot.flowData, 
            phase: "simulate", 
            history: [] 
        })
    });

    if (!aiRes.ok) {
        console.error("AI Engine Failed:", aiRes.statusText);
        return NextResponse.json({ status: "engine_error" }, { status: 200 });
    }

    const aiData = await aiRes.json();
    const replyText = aiData.reply;

    if (replyText) {
        // 4. שליחת התשובה לוואטסאפ של הלקוח 🗣️
        console.log("✅ AI Replied:", replyText);
        
        // כאן אנחנו משתמשים בפונקציה מהספרייה החיצונית
        await sendWhatsAppText({
            to: from,
            body: replyText,
            phoneNumberId: connection.phoneNumberId,
            accessToken: connection.accessToken || "" 
        });

        // שמירת תשובת הבוט ב-DB
        await prisma.message.create({
            data: {
                botId: connection.bot.id,
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
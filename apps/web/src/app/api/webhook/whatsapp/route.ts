// apps/web/src/app/api/webhooks/whatsapp/route.ts
import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/prisma";

// ✅ שלב אימות מול Meta (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_SECRET) {
    return new Response(challenge || "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ✅ קבלת הודעות בפועל (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Meta שולחת מבנה די עמוק, ניקח רק מה שצריך
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages as any[] | undefined;

    if (!messages || !messages.length) {
      return NextResponse.json({ received: true });
    }

    for (const msg of messages) {
      const from = msg.from as string;      // מספר הלקוח
      const text = msg.text?.body as string | undefined;
      const waId = value.metadata?.phone_number_id as string | undefined;

      if (!text || !waId) continue;

      // בשלב ראשון – רק נשמור לוג. בהמשך נחבר למנוע ה-Flow.
      await prisma.message.create({
        data: {
          botId: "unknown", // TODO: לשייך לבוט לפי whatsappConnections + waId
          userId: null,
          fromPhone: from,
          toPhone: waId,
          direction: "IN",
          content: text,
        },
      });

      console.log("Incoming WhatsApp message:", { from, text });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WHATSAPP WEBHOOK ERROR:", err);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
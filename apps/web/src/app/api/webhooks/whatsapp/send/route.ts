import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const to = body?.to;
    const text = body?.text;

    // --- שינוי קטן לטובת הדינמיות ---
    // אם שלחנו טוקן ו-ID בגוף הבקשה (מה-DB), נשתמש בהם. 
    // אם לא, נשתמש ב-env כברירת מחדל (מה שיש לך היום).
    const TOKEN = body?.accessToken || process.env.WHATSAPP_TOKEN;
    const PHONE_ID = body?.phoneId || process.env.WHATSAPP_PHONE_ID;

    if (!to || !text) {
      return NextResponse.json({ error: "חסר to/text" }, { status: 400 });
    }

    if (!TOKEN || !PHONE_ID) {
      console.log("MOCK SEND (Missing Credentials):", { to, text });
      return NextResponse.json({ ok: true, mock: true }, { status: 200 });
    }

    // שימוש בגרסה v20.0 כפי שמופיע בקוד המקורי שלך
    const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("WA SEND ERROR:", data);
      return NextResponse.json({ error: "WA error", details: data }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("WA SEND CATCH:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
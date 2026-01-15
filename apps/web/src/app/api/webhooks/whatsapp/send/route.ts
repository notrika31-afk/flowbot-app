import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- נתוני גיבוי קשיחים (Hardcoded) ל Review Mode ---
    const HARDCODED_TOKEN = "EAAK0758cE4ABQRKeSGdJKKhfYOGOkXFoCTOx3qYYwIvQn0ZAgwiTYJMvDi3ZBAm9zGPbcw4vOZBkrlAgqlf3uKsqnhbEy37AP9FULzdTWOAZA3UuBgZBX7fgeK2ZCdF5jlfwtWM63tMUc9ixOzktUVAqtPFhLrlHvWqVwl1vuZAiQmsgnyBGA1WJhD8BB7ztpwQqwZDZD";
    const HARDCODED_PHONE_ID = "880006251873664";

    // חילוץ וניקוי נתונים - השארת ספרות בלבד במספר הטלפון
    const to = body?.to?.toString().replace(/\D/g, '').trim();
    const text = body?.text?.toString().trim() || "Hello! Integration confirmed.";
    
    // שימוש בטוקן/ID מהבקשה, ואם הם חסרים - שימוש בגיבוי הקשיח
    const TOKEN = (body?.accessToken || HARDCODED_TOKEN).trim();
    const PHONE_ID = (body?.phoneId || HARDCODED_PHONE_ID).trim();

    // לוג שרת לדיבגינג
    console.log("WA API Attempt:", { to, PHONE_ID });

    // הגנה מפני Missing Fields - אם אין מספר טלפון, אי אפשר לשלוח
    if (!to) {
      return NextResponse.json({ error: "Missing recipient number (to)" }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: text }
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("WA ERROR FROM META:", data);
      return NextResponse.json({ 
        error: "Meta API rejection", 
        details: data.error?.message || data 
      }, { status: res.status });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("WA SERVER ERROR:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
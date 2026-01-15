import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // שליפת הנתונים וביצוע המרה למחרוזת וניקוי רווחים למניעת "Missing fields"
    const to = body?.to?.toString().replace('+', '').trim();
    const text = body?.text;

    // הגדרת הטוקן וה-ID עם ניקוי רווחים מיותרים
    const TOKEN = (body?.accessToken || process.env.WHATSAPP_TOKEN)?.toString().trim();
    const PHONE_ID = (body?.phoneId || process.env.WHATSAPP_PHONE_ID)?.toString().trim();

    // לוג לבדיקה בשרת - עוזר לראות מה נשלח בפועל
    console.log("Attempting to send WA message to:", to);

    // בדיקה מחמירה שכל ארבעת הפרמטרים קיימים לפני הפנייה למטא
    if (!to || !text || !TOKEN || !PHONE_ID) {
      return NextResponse.json({ 
        error: "Missing mandatory fields", 
        check: { to: !!to, text: !!text, token: !!TOKEN, phoneId: !!PHONE_ID } 
      }, { status: 400 });
    }

    // שימוש בגרסה v22.0 כפי שמופיע בלוח הבקרה שלך
    const url = `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual", // שדה מומלץ למניעת שגיאות פענוח
        to: to,
        type: "text", 
        text: { body: text },
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("WA SEND ERROR FROM META:", data);
      // החזרת פירוט השגיאה המלא ממטא ל-Frontend
      return NextResponse.json({ 
        error: "WA error", 
        details: data.error?.message || data 
      }, { status: res.status });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("WA SEND CATCH:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
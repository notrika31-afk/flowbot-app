import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. ניקוי אגרסיבי של מספר הטלפון - השארת ספרות בלבד (חובה ב-v22.0)
    // סימן ה-+ או רווחים גורמים למטא להחזיר "Missing fields" או שגיאת פורמט
    const to = body?.to?.toString().replace(/\D/g, '').trim();
    const text = body?.text?.toString().trim();

    // 2. שליפת טוקן ו-ID עם ניקוי רווחים
    const TOKEN = (body?.accessToken || process.env.WHATSAPP_TOKEN)?.toString().trim();
    const PHONE_ID = (body?.phoneId || process.env.WHATSAPP_PHONE_ID)?.toString().trim();

    // לוג שרת לדיבגינג - עוזר לוודא שהנתונים לא ריקים לפני השליחה
    console.log("Meta API Call Prep:", { to, PHONE_ID, hasToken: !!TOKEN });

    // 3. בדיקת חובה: אם אחד מהם ריק, נעצור כאן ולא נשלח בקשה פגומה למטא
    if (!to || !text || !TOKEN || !PHONE_ID) {
      return NextResponse.json({ 
        error: "Missing fields in server request", 
        details: { to: !!to, text: !!text, token: !!TOKEN, phoneId: !!PHONE_ID } 
      }, { status: 400 });
    }

    // 4. בניית הבקשה המדויקת לפי v22.0
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
      console.error("META ERROR RESPONSE:", data);
      return NextResponse.json({ 
        error: "Meta API rejection", 
        details: data.error?.message || data 
      }, { status: res.status });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("CRITICAL SERVER ERROR:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
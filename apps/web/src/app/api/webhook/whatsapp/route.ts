import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // פייסבוק שולח את הפרמטרים האלו כדי לבדוק את האתר שלך
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // בדיקה שהטוקן תואם למה שרשמת בפייסבוק
  const VERIFY_TOKEN = "flowbot_verify_token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    // חייבים להחזיר את ה-challenge כטקסט פשוט
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("❌ Webhook verification failed. Token mismatch.");
  return new NextResponse("Forbidden", { status: 403 });
}

// פונקציה לקבלת הודעות (POST) - זה מה שיגרום לבוט לענות
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📩 New message received:", JSON.stringify(body, null, 2));

    // כאן תבוא הלוגיקה של הבוט שלך בהמשך
    
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Post Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
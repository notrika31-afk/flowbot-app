import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const session = await getUserSession();

    if (!session || !session.id) return new NextResponse("Unauthorized", { status: 401 });
    if (!code) return new NextResponse("No code provided", { status: 400 });

    // 1. החלפת קוד בטוקן
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent("https://flowbot.ink/api/integrations/whatsapp/callback")}`
    );
    
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    const accessToken = tokenData.access_token;
    const wabaId = searchParams.get("whatsapp_business_account_id");

    // 2. שמירה ב-DB (הוספתי לוג קטן לווידוא)
    console.log(`[WABA Callback] Saving connection for user ${session.id}, WABA: ${wabaId}`);
    
    await prisma.wabaConnection.upsert({
        where: { userId: session.id },
        update: { accessToken, wabaId: wabaId || "", isActive: true },
        create: { 
            userId: session.id, 
            wabaId: wabaId || "", 
            accessToken, 
            verifyToken: "flowbot_verify_token", 
            isActive: true 
        }
    });

    // 3. החלק הקריטי: סקריפט סגירה חכם
    // הוספתי המתנה קלה (100ms) כדי לוודא שההודעה נשלחת לפני שהחלון נסגר
    return new NextResponse(`
      <html>
        <body style="background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <h2 style="color: #1e293b;">החיבור הושלם!</h2>
            <p style="color: #64748b;">החלון ייסגר כעת באופן אוטומטי...</p>
          </div>
          <script>
            const result = { type: 'FACEBOOK_AUTH_RESULT', status: 'SUCCESS' };
            
            // שמירה ליתר ביטחון למקרה שה-postMessage ייכשל
            localStorage.setItem('fb_auth_result', JSON.stringify(result));
            
            // שליחת הודעה לחלון הראשי
            if (window.opener) {
              window.opener.postMessage(result, "https://flowbot.ink");
              
              // הוספת השהייה קלה לפני הסגירה כדי שהדפדפן יספיק לשלוח את ההודעה
              setTimeout(() => {
                window.close();
              }, 500);
            } else {
              // אם החלון נפתח לא כפופ-אפ, פשוט נחזיר לדף הבית
              window.location.href = "/builder/whatsapp";
            }
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    console.error("[WABA Callback ERROR]:", error.message);
    return new NextResponse(`
        <html><body><script>
            window.opener.postMessage({ type: 'FACEBOOK_AUTH_RESULT', status: 'ERROR', message: '${error.message}' }, "https://flowbot.ink");
            setTimeout(() => window.close(), 2000);
        </script></body></html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
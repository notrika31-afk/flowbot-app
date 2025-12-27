import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    
    // 1. אימות משתמש מחובר
    const session = await getUserSession();
    if (!session || !session.id) {
      console.error("❌ Auth Error: No session found");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // בדיקה אם פייסבוק החזיר קוד
    if (!code) {
      console.error("❌ Facebook Error: No code provided");
      return new NextResponse("No code provided from Facebook", { status: 400 });
    }

    // --- שלב החלפת הקוד בטוקן אמיתי (Token Exchange) ---
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET; // וודא שזה קיים ב-.env שלך!
    const redirectUri = "https://flowbot.ink/api/integrations/whatsapp/callback";

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&code=${code}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("❌ Facebook Token Error:", tokenData.error);
      return new NextResponse(`Facebook Token Error: ${tokenData.error.message}`, { status: 400 });
    }

    // הטוקן האמיתי שקיבלנו מפייסבוק
    const accessToken = tokenData.access_token;
    
    // שליפת ה-WABA ID מהפרמטרים שפייסבוק שולח חזרה בסיום ה-Embedded Signup
    const wabaId = searchParams.get("whatsapp_business_account_id");

    if (!wabaId) {
        console.error("❌ WABA ID Error: No WhatsApp Business Account ID provided");
        return new NextResponse("Missing WABA ID from Facebook", { status: 400 });
    }

    // 2. שמירת החיבור ב-Database
    const existingConnection = await prisma.wabaConnection.findFirst({
        where: { userId: session.id }
    });

    if (existingConnection) {
        // עדכון חיבור קיים
        await prisma.wabaConnection.update({
            where: { id: existingConnection.id },
            data: { 
                accessToken: accessToken, 
                isActive: true,
                wabaId: wabaId,
                phoneNumberId: wabaId // בשלב זה משתמשים ב-WABA ID, בהמשך נשלוף את ה-Phone Number ID המדויק
            }
        });
    } else {
        // יצירת חיבור חדש לגמרי
        await prisma.wabaConnection.create({
            data: {
                userId: session.id,
                wabaId: wabaId,
                phoneNumberId: wabaId,
                accessToken: accessToken,
                verifyToken: "flowbot_verify_token",
                isActive: true
            }
        });
    }

    // 3. החזרת ה-HTML שסוגר את החלון ומעדכן את האתר הראשי
    return new NextResponse(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>החיבור הצליח!</title>
        </head>
        <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background:#f9fafb; margin:0;">
          <div style="text-align:center; padding: 20px;">
            <div style="color:#16a34a; font-size:60px; margin-bottom:10px;">✓</div>
            <h2 style="color:#111827; margin-bottom:10px;">החיבור הושלם בהצלחה!</h2>
            <p style="color:#6b7280;">חשבון הוואטסאפ סונכרן למערכת. החלון ייסגר מיד...</p>
          </div>
          <script>
            localStorage.setItem('fb_auth_result', JSON.stringify({ 
              status: 'SUCCESS',
              timestamp: new Date().getTime() 
            }));

            if (window.opener) {
              window.opener.postMessage({ type: 'FACEBOOK_AUTH_RESULT', status: 'SUCCESS' }, '*');
            }

            setTimeout(() => {
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `, { 
      headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    });

  } catch (error) {
    console.error("❌ Callback Error:", error);
    return new NextResponse("Internal Server Error during WhatsApp connection", { status: 500 });
  }
}
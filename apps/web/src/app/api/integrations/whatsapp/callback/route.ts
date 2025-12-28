import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const session = await getUserSession();

    if (!session?.id) return new Response("Unauthorized", { status: 401 });
    if (!code) return new Response("No code provided", { status: 400 });

    // 1. החלפת קוד בטוקן
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}` +
      `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
      `&code=${code}` +
      `&redirect_uri=${encodeURIComponent("https://flowbot.ink/api/integrations/whatsapp/callback")}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    
    if (tokenData.error) throw new Error(tokenData.error.message);
    const accessToken = tokenData.access_token;

    // 2. שליפת ה-Phone Number ID (כדי שהמספר באמת יתחבר)
    // אנחנו שואלים את פייסבוק: "איזה מספרי טלפון יש בחשבון הזה?"
    const wabaId = searchParams.get("whatsapp_business_account_id");
    let phoneNumberId = "";

    if (wabaId) {
        const phoneRes = await fetch(
            `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`
        );
        const phoneData = await phoneRes.json();
        if (phoneData.data && phoneData.data.length > 0) {
            phoneNumberId = phoneData.data[0].id; // לוקחים את המספר הראשון שמחובר
        }
    }

    // 3. שמירה ב-DB - מעדכנים גם את ה-wabaId וגם את ה-phoneNumberId
    await prisma.wabaConnection.upsert({
        where: { userId: session.id },
        update: { 
            accessToken, 
            wabaId: wabaId || "", 
            phoneNumberId: phoneNumberId, // חשוב לחיבור הממשי
            isActive: true 
        },
        create: { 
            userId: session.id, 
            wabaId: wabaId || "", 
            phoneNumberId: phoneNumberId,
            accessToken, 
            verifyToken: "flowbot_verify_token", 
            isActive: true 
        }
    });

    // 4. HTML מאובטח לסגירת החלון (מונע מסך לבן)
    const html = `
      <html>
        <body style="background:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">
          <div style="text-align:center;padding:20px;background:white;border-radius:16px;shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="color:#22c55e;font-size:48px;margin-bottom:10px;">✓</div>
            <h2 style="color:#1e293b;margin:0 0 10px 0;">החיבור הצליח!</h2>
            <p style="color:#64748b;margin:0;">החלון ייסגר כעת...</p>
          </div>
          <script>
            const result = { type: 'FACEBOOK_AUTH_RESULT', status: 'SUCCESS' };
            localStorage.setItem('fb_auth_result', JSON.stringify(result));
            
            if (window.opener) {
              window.opener.postMessage(result, "https://flowbot.ink");
              setTimeout(() => { window.close(); }, 1000);
            } else {
              window.location.href = "/builder/whatsapp";
            }
          </script>
        </body>
      </html>
    `;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    console.error("WABA Error:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
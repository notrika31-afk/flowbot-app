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

    // החלפת קוד בטוקן קבוע
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent("https://flowbot.ink/api/integrations/whatsapp/callback")}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    const accessToken = tokenData.access_token;
    const wabaId = searchParams.get("whatsapp_business_account_id");

    // שמירה ב-DB
    await prisma.wabaConnection.upsert({
        where: { userId: session.id },
        update: { accessToken, wabaId, isActive: true },
        create: { userId: session.id, wabaId: wabaId!, accessToken, verifyToken: "flowbot_verify_token", isActive: true }
    });

    return new NextResponse(`
      <html><body><script>
        localStorage.setItem('fb_auth_result', JSON.stringify({ status: 'SUCCESS' }));
        if (window.opener) window.opener.postMessage({ type: 'FACEBOOK_AUTH_RESULT', status: 'SUCCESS' }, '*');
        window.close();
      </script></body></html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
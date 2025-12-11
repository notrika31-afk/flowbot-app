import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient } from "@/lib/google";
import { getUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; 

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const cleanProvider = provider.replace("-", "_"); 

  console.log(`[Auth Login] Start. Provider: ${cleanProvider}`);

  const returnUrl = "/builder/connect";

  // 1. קבלת המשתמש מהסשן
  const user = await getUserSession();
  
  if (!user || !user.id) {
      const errorUrl = new URL(returnUrl, req.url);
      errorUrl.searchParams.set("error", "unauthorized_login_attempt");
      return NextResponse.redirect(errorUrl);
  }

  // 2. בדיקת הגנה קריטית: האם המשתמש באמת קיים ב-DB?
  const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true }
  });

  if (!dbUser) {
      console.error(`[Auth Login] Ghost user detected! ID ${user.id} exists in session but NOT in DB.`);
      
      const errorUrl = new URL(returnUrl, req.url);
      errorUrl.searchParams.set("error", "database_mismatch");
      errorUrl.searchParams.set("details", "Please Log Out and Sign In again");
      return NextResponse.redirect(errorUrl);
  }

  // וידוא משתני סביבה
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const errorUrl = new URL(returnUrl, req.url);
    errorUrl.searchParams.set("error", "server_config_missing");
    return NextResponse.redirect(errorUrl);
  }

  try {
    const oAuth2Client = createOAuthClient();
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/${cleanProvider}/callback`;
    
    // מחיקת השורה הבעייתית: oAuth2Client.redirectUri = callbackUrl;

    const scopeType = cleanProvider === 'google_sheets' ? 'sheets' : 'calendar';
    
    // 3. שליחה לגוגל
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        redirect_uri: callbackUrl, // <--- הנה התיקון: מעבירים את הכתובת כאן בפנים
        scope: scopeType === 'sheets' 
            ? [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/userinfo.email"
              ]
            : [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/userinfo.email"
              ],
        state: user.id 
    });
    
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error("[Auth Login] Error:", error);
    const errorUrl = new URL(returnUrl, req.url);
    errorUrl.searchParams.set("error", "auth_generation_failed");
    return NextResponse.redirect(errorUrl);
  }
}
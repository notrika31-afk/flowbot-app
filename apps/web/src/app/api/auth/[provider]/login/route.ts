import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, getAuthUrl } from "@/lib/google";
import { getUserSession } from "@/lib/auth"; // וודא שהייבוא הזה קיים אצלך

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const cleanProvider = provider.replace("-", "_"); 

  console.log(`[Auth Login] Start. Provider: ${cleanProvider}`);

  const returnUrl = "/builder/connect";

  // 1. קבלת המשתמש הנוכחי לפני היציאה לגוגל
  const user = await getUserSession();
  
  if (!user || !user.id) {
      // אם אין משתמש, אין טעם לצאת לגוגל
      const errorUrl = new URL(returnUrl, req.url);
      errorUrl.searchParams.set("error", "unauthorized_login_attempt");
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
    oAuth2Client.redirectUri = callbackUrl;

    // בחירת סוג ההרשאה
    const scopeType = cleanProvider === 'google_sheets' ? 'sheets' : 'calendar';
    
    // 2. יצירת ה-URL עם ה-userId בתוך ה-State
    // זה הטריק: אנחנו מעבירים את ה-ID של המשתמש לגוגל, והם יחזירו לנו אותו
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
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
        state: user.id // <--- הנה התיקון: שליחת ה-ID
    });
    
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error("[Auth Login] Error:", error);
    const errorUrl = new URL(returnUrl, req.url);
    errorUrl.searchParams.set("error", "auth_generation_failed");
    return NextResponse.redirect(errorUrl);
  }
}
// force update vercelimport { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { createOAuthClient } from "@/lib/google";
import { prisma } from "@/lib/prisma";
// מחקנו את השורה הבעייתית: import { IntegrationProvider } from "@prisma/client";

export const dynamic = "force-dynamic"; // VERCEL_FIX_1
function mapSlugToPrismaEnum(slug: string): any { // שינינו את ה-Return Type ל-any כדי למנוע שגיאות
  const normalizedSlug = slug.trim().toLowerCase().replace(/-/g, "_");
  const expectedEnumName = normalizedSlug.toUpperCase();
  
  // במקום להסתמך על ה-Enum שלא נמצא, אנחנו בודקים מול רשימה ידנית בטוחה
  // זה מונע את הקריסה ב-Vercel
  const VALID_PROVIDERS = [
      "GOOGLE", 
      "GOOGLE_CALENDAR", 
      "PAYBOX", 
      "STRIPE", 
      "PAYPAL", 
      "MAKE", 
      "SITE_LINK"
  ];

  if (VALID_PROVIDERS.includes(expectedEnumName)) {
    return expectedEnumName;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params; 
  const cleanProvider = provider.trim(); 
  const TARGET_PATH = "/builder/connect";
  
  const createRedirectUrl = (params: Record<string, string>) => {
    const url = new URL(TARGET_PATH, req.url);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  };

  const finalProvider = mapSlugToPrismaEnum(cleanProvider);

  if (!finalProvider) {
      return NextResponse.redirect(createRedirectUrl({ error: "invalid_provider_mapping" }));
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/${cleanProvider}/callback`;

  try {
    // 1. חילוץ פרמטרים
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const stateUserId = searchParams.get("state"); 

    if (error) {
      return NextResponse.redirect(createRedirectUrl({ error: "access_denied", details: error }));
    }
    if (!code) {
      return NextResponse.redirect(createRedirectUrl({ error: "no_code" }));
    }

    // 2. זיהוי המשתמש + וידוא קיום ב-DB
    let userId = "";
    const session = await getUserSession();
    
    // שלב א: נסה לקחת מהסשן
    if (session && session.id) {
        userId = session.id;
    } 
    // שלב ב: אם אין סשן, קח מה-URL (State)
    else if (stateUserId) {
        console.log(`[Auth Callback] Session lost, attempting to use State ID: ${stateUserId}`);
        userId = stateUserId;
    } else {
        return NextResponse.redirect(createRedirectUrl({ error: "unauthorized_no_user" }));
    }

    // שלב ג: בדיקה מול הדאטה-בייס
    const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
    });

    if (!userExists) {
        console.error(`[Auth Callback] CRITICAL: User ID ${userId} is in the browser but NOT in the Database.`);
        return NextResponse.redirect(createRedirectUrl({ 
            error: "user_mismatch", 
            details: "Database reset detected. Please Log Out and Sign Up again." 
        }));
    }

    // 3. המרת קוד לטוקן
    const oAuth2Client = createOAuthClient();
    oAuth2Client.redirectUri = callbackUrl; 
    
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // 4. מציאת הבוט (לרפרנס)
    const activeBot = await prisma.bot.findFirst({
        where: { ownerId: userId }, 
        orderBy: { updatedAt: 'desc' },
        select: { id: true }
    });

    const extraData = {
        scope: tokens.scope,
        tokenType: tokens.token_type,
        expiryDate: tokens.expiry_date,
        updatedAt: new Date().toISOString()
    };

    // 5. שמירה לדאטה-בייס
    try {
        await prisma.integrationConnection.upsert({
            where: {
                userId_provider: {
                    userId: userId,
                    provider: finalProvider // השתמשנו ב-any ולכן זה יעבור חלק
                }
            },
            update: {
                status: "CONNECTED",
                accessToken: tokens.access_token, 
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                metadata: extraData,
                webhookId: null
            },
            create: {
                userId: userId,
                ...(activeBot ? { botId: activeBot.id } : {}), 
                provider: finalProvider, 
                status: "CONNECTED",
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                metadata: extraData,
                webhookId: null
            }
        });
    } catch (upsertError: any) {
         if (activeBot && upsertError.message?.includes('botId')) {
             await prisma.integrationConnection.upsert({
                where: {
                    botId_provider: {
                        botId: activeBot.id,
                        provider: finalProvider
                    }
                },
                update: {
                    status: "CONNECTED",
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    metadata: extraData,
                    webhookId: null
                },
                create: {
                    botId: activeBot.id,
                    provider: finalProvider,
                    status: "CONNECTED",
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    metadata: extraData,
                    webhookId: null
                }
            });
        } else {
            throw upsertError;
        }
    }

    console.log(`[Auth Callback] Success for User: ${userId}`);

    return NextResponse.redirect(
      createRedirectUrl({ success: "true", provider: cleanProvider })
    );

  } catch (err: any) {
    console.error("[Auth Callback] ERROR:", err);
    return NextResponse.redirect(
      createRedirectUrl({ error: "server_error", details: err.message })
    );
  }
}
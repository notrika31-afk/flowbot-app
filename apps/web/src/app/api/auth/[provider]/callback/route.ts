// force update vercel
import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google"; // שמרתי על הייבוא המקורי שלך
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// =============================
// המרת slug ל-Enum בטוח
// =============================
function mapSlugToPrismaEnum(slug: string): any {
  const normalizedSlug = slug.trim().toLowerCase().replace(/-/g, "_");
  const expectedEnumName = normalizedSlug.toUpperCase();

  const VALID_PROVIDERS = [
    "GOOGLE",
    "GOOGLE_CALENDAR",
    "GOOGLE_SHEETS", // <--- השינוי היחיד: הוספתי את זה כדי שהשיטס לא יעוף
    "PAYBOX",
    "STRIPE",
    "PAYPAL",
    "MAKE",
    "SITE_LINK",
  ];

  return VALID_PROVIDERS.includes(expectedEnumName)
    ? expectedEnumName
    : null;
}

// =============================
// MAIN HANDLER
// =============================
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const cleanProvider = params.provider.trim();
  const TARGET_PATH = "/builder/connect";

  const createRedirectUrl = (params: Record<string, string>) => {
    const url = new URL(TARGET_PATH, req.url);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );
    return url;
  };

  const finalProvider = mapSlugToPrismaEnum(cleanProvider);
  if (!finalProvider)
    return NextResponse.redirect(
      createRedirectUrl({ error: "invalid_provider_mapping" })
    );

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/${cleanProvider}/callback`;

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const stateUserId = searchParams.get("state");

    if (error)
      return NextResponse.redirect(
        createRedirectUrl({ error: "access_denied", details: error })
      );

    if (!code)
      return NextResponse.redirect(createRedirectUrl({ error: "no_code" }));

    // =============================
    // זיהוי משתמש
    // =============================
    const session = await getUserSession();
    let userId = session?.id || stateUserId;

    if (!userId)
      return NextResponse.redirect(
        createRedirectUrl({ error: "unauthorized_no_user" })
      );

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
        // הוספתי כאן מחיקת עוגיות למקרה של Ghost User, בלי לשנות את מבנה הקוד
        const response = NextResponse.redirect(
            createRedirectUrl({
              error: "user_mismatch",
              details: "Database reset detected. Please re-login.",
            })
        );
        response.cookies.delete("next-auth.session-token");
        return response;
    }

    // =============================
    // בניית OAuth2 Client תקין
    // =============================
    // שמרתי בדיוק על הקוד שלך כאן
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl 
    );

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // =============================
    // מציאת הבוט
    // =============================
    const activeBot = await prisma.bot.findFirst({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    const extraData = {
      scope: tokens.scope,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date,
      updatedAt: new Date().toISOString(),
    };

    // =============================
    // שלב שמירה - ה-Upsert המקורי שלך
    // =============================
    try {
      await prisma.integrationConnection.upsert({
        where: {
          userId_provider: {
            userId,
            provider: finalProvider,
          },
        },
        update: {
          status: "CONNECTED",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
          metadata: extraData,
          webhookId: null,
        },
        create: {
          userId,
          ...(activeBot ? { botId: activeBot.id } : {}),
          provider: finalProvider,
          status: "CONNECTED",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
          metadata: extraData,
          webhookId: null,
        },
      });

    } catch (upsertError: any) {
      // fallback לפי botId - שמרתי את זה בדיוק כפי שהיה
      if (activeBot && upsertError.message?.includes("botId")) {
        await prisma.integrationConnection.upsert({
          where: {
            botId_provider: {
              botId: activeBot.id,
              provider: finalProvider,
            },
          } as any,
          update: {
            status: "CONNECTED",
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            metadata: extraData,
            webhookId: null,
          },
          create: {
            botId: activeBot.id,
            provider: finalProvider,
            status: "CONNECTED",
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            metadata: extraData,
            webhookId: null,
          },
        });
      } else {
        throw upsertError;
      }
    }

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
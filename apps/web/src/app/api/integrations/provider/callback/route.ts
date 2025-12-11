// app/api/integrations/[provider]/callback/route.ts
import { NextResponse } from "next/server";
import { getAuthUserFromToken } from "@/lib/auth"; // שימוש בפונקציית האימות שלך
import { prisma } from "@/lib/db";
import { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { 
    PROVIDERS, 
    type ProviderConfig, 
    type ProviderSlug, 
    getAccessTokenFromCode, 
    type OAuthTokenResponse 
} from "@/lib/integrations/providers"; 

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const REDIRECT_AFTER_AUTH = "/builder/connect";

function getCallbackUrl(providerSlug: ProviderSlug): string {
    return `${BASE_URL}/api/integrations/${providerSlug}/callback`;
}

function mapProviderSlugToPrismaEnum(slug: ProviderSlug): IntegrationProvider | null {
  const provider = PROVIDERS[slug];
  if (!provider) return null;
  return provider.provider;
}


// 2. GET /api/integrations/[provider]/callback
export async function GET(
    request: Request, 
    { params }: { params: { provider: ProviderSlug } }
) {
    const user = getAuthUserFromToken();

    if (!user?.id) {
        // אין סשן משתמש: מפנים חזרה עם הודעת שגיאה
        return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?error=session_expired`);
    }

    const userId = user.id;
    const providerSlug = params.provider;
    const providerConfig: ProviderConfig | undefined = PROVIDERS[providerSlug];
    const providerEnum = mapProviderSlugToPrismaEnum(providerSlug);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
        console.error(`OAuth Callback Error from ${providerSlug}: ${error}`);
        return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?error=authorization_failed`);
    }

    if (!providerConfig || providerConfig.mode !== 'oauth' || !providerEnum) {
        return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?error=invalid_provider`);
    }
    
    // שליפת מפתחות סודיים מה-ENV
    const CLIENT_ID_ENV_KEY = `${providerSlug.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`;
    const CLIENT_SECRET_ENV_KEY = `${providerSlug.toUpperCase().replace(/-/g, '_')}_CLIENT_SECRET`;
    const clientId = process.env[CLIENT_ID_ENV_KEY];
    const clientSecret = process.env[CLIENT_SECRET_ENV_KEY];

    if (!clientId || !clientSecret) {
         console.error(`[OAuth Callback Error] Missing client secrets for ${providerSlug}`);
         return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?error=server_config_error`);
    }

    try {
        // שלב 1: החלפת קוד הרשאה בטוקן גישה
        const tokenResponse: OAuthTokenResponse = await getAccessTokenFromCode({
            providerSlug,
            code,
            redirectUri: getCallbackUrl(providerSlug),
            clientId: clientId,
            clientSecret: clientSecret,
        });
        
        // שלב 2: חישוב מועד התפוגה של הטוקן
        const expiresAt = tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null;

        // שלב 3: שמירת רשומת החיבור ב-DB באמצעות upsert
        await prisma.integrationConnection.upsert({
            where: {
                userId_provider: {
                    userId,
                    provider: providerEnum,
                },
            },
            update: {
                status: IntegrationStatus.CONNECTED,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                expiresAt: expiresAt,
                metadata: { ...providerConfig.metadata, ...tokenResponse.metadata },
            },
            create: {
                userId,
                provider: providerEnum,
                status: IntegrationStatus.CONNECTED,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                expiresAt: expiresAt,
                metadata: { ...providerConfig.metadata, ...tokenResponse.metadata },
            },
        });

        // הצלחה: הפנייה מחדש לדף החיבורים
        return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?success=${providerSlug}`);
        
    } catch (e) {
        console.error(`[API/Integrations/Callback] Token exchange failed for ${providerSlug}:`, e);
        return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?error=token_exchange_failed`);
    }
}

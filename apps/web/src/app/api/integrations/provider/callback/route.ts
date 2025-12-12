import { NextResponse } from "next/server";
import { getAuthUserFromToken } from "@/lib/auth"; 
import { prisma } from "@/lib/db";
import { 
    PROVIDERS, 
    type ProviderConfig, 
    type ProviderSlug, 
    getAccessTokenFromCode, 
    type OAuthTokenResponse 
} from "@/lib/integrations/providers"; 

// ==============================================================================
// תיקון קריטי לשגיאת Build:
// דף Callback חייב להיות דינמי כי הוא תלוי ב-URL Params (code) ובעוגיות.
// ההגדרות האלו מונעות מ-Next.js לנסות להריץ אותו בזמן הבנייה.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// ==============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const REDIRECT_AFTER_AUTH = "/builder/connect";

function getCallbackUrl(providerSlug: ProviderSlug): string {
    return `${BASE_URL}/api/integrations/${providerSlug}/callback`;
}

// פונקציה מפושטת שמחזירה מחרוזת במקום Enum
function mapProviderSlugToPrismaEnum(slug: ProviderSlug): string | null {
  const provider = PROVIDERS[slug];
  if (!provider) return null;
  // שימוש ב-as any או as string כדי לעקוף את בעיית ה-Types
  return provider.provider as any;
}

export async function GET(
    request: Request, 
    { params }: { params: { provider: ProviderSlug } }
) {
    // התיקון: הוספת await כדי לקבל את המשתמש האמיתי
    const user = await getAuthUserFromToken();

    if (!user?.id) {
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
    
    const CLIENT_ID_ENV_KEY = `${providerSlug.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`;
    const CLIENT_SECRET_ENV_KEY = `${providerSlug.toUpperCase().replace(/-/g, '_')}_CLIENT_SECRET`;
    const clientId = process.env[CLIENT_ID_ENV_KEY];
    const clientSecret = process.env[CLIENT_SECRET_ENV_KEY];

    if (!clientId || !clientSecret) {
         console.error(`[OAuth Callback Error] Missing client secrets for ${providerSlug}`);
         return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?error=server_config_error`);
    }

    try {
        const tokenResponse: OAuthTokenResponse = await getAccessTokenFromCode({
            providerSlug,
            code,
            redirectUri: getCallbackUrl(providerSlug),
            clientId: clientId,
            clientSecret: clientSecret,
        });
        
        const expiresAt = tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null;

        // שימוש ב-as any כדי לאפשר גישה ל-metadata גם אם הוא לא מוגדר ב-Type
        const configMeta = (providerConfig as any).metadata || {};
        const tokenMeta = (tokenResponse as any).metadata || {};

        await prisma.integrationConnection.upsert({
            where: {
                userId_provider: {
                    userId,
                    provider: providerEnum as any,
                },
            },
            update: {
                status: 'CONNECTED',
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                expiresAt: expiresAt,
                metadata: { ...configMeta, ...tokenMeta },
            },
            create: {
                userId,
                provider: providerEnum as any,
                status: 'CONNECTED',
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                expiresAt: expiresAt,
                metadata: { ...configMeta, ...tokenMeta },
            },
        });

        return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?success=${providerSlug}`);
        
    } catch (e) {
        console.error(`[API/Integrations/Callback] Token exchange failed for ${providerSlug}:`, e);
        return NextResponse.redirect(`${BASE_URL}${REDIRECT_AFTER_AUTH}?error=token_exchange_failed`);
    }
}

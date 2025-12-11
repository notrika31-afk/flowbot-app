// app/api/integrations/[provider]/start/route.ts
import { NextResponse } from "next/server";
import { getAuthUserFromToken } from "@/lib/auth"; // שימוש בפונקציית האימות שלך
import { PROVIDERS, type ProviderConfig, type ProviderSlug } from "@/lib/integrations/providers";

// כתובת URL בסיסית של השרת שלך
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// פונקציה לבניית כתובת ה-Callback (חזרה אלינו)
function getCallbackUrl(providerSlug: ProviderSlug): string {
    return `${BASE_URL}/api/integrations/${providerSlug}/callback`;
}

// פונקציה פשוטה ליצירת מחרוזת קווירים
function buildQueryString(params: Record<string, string | undefined>): string {
    const parts: string[] = [];
    for (const key in params) {
        if (params[key]) {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key]!)}`);
        }
    }
    return parts.join('&');
}

// 1. GET /api/integrations/[provider]/start
export async function GET(
    request: Request, 
    { params }: { params: { provider: ProviderSlug } }
) {
    const user = getAuthUserFromToken();

    if (!user?.id) {
        // פותר את שגיאת ה-401 אם המשתמש לא מחובר
        return NextResponse.json({ error: "נדרשת הרשאת משתמש" }, { status: 401 });
    }

    const providerSlug = params.provider;
    const providerConfig: ProviderConfig | undefined = PROVIDERS[providerSlug];

    if (!providerConfig || providerConfig.mode !== 'oauth') {
        return NextResponse.json({ error: "ספק לא נמצא או לא תומך ב-OAuth" }, { status: 400 });
    }
    
    // ניהול מפתחות סודיים מתוך משתני הסביבה (בודק את ה-CLIENT_ID)
    const CLIENT_ID_ENV_KEY = `${providerSlug.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`;
    const CLIENT_ID = process.env[CLIENT_ID_ENV_KEY];
    const SCOPE = providerConfig.scope;
    
    if (!CLIENT_ID || !providerConfig.authUrl) {
        console.error(`[OAuth Start Error] Missing ENV for provider: ${CLIENT_ID_ENV_KEY}`);
        return NextResponse.json({ error: "הגדרות ספק חסרות בשרת" }, { status: 500 });
    }

    const state = Math.random().toString(36).substring(2, 15); 

    const redirectUri = getCallbackUrl(providerSlug);
    
    const queryParams: Record<string, string | undefined> = {
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        scope: SCOPE,
        state: state,
        ...providerConfig.extraAuthParams, 
    };

    const authUrl = `${providerConfig.authUrl}?${buildQueryString(queryParams)}`;

    return NextResponse.json({ url: authUrl, state }, { status: 200 });
}

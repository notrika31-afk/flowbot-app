// Providers.ts
// @ts-ignore - כיבוי בדיקת הטיפוסים בשל בעיות חוזרות ב-Prisma generate
import type { IntegrationProvider } from "@prisma/client";

// =========================================================
// TYPES & ENUMS
// =========================================================

export type IntegrationStatusValue = "CONNECTED" | "PENDING" | "DISCONNECTED";
export const INTEGRATION_STATUS_VALUES: IntegrationStatusValue[] = [
  "CONNECTED",
  "PENDING",
  "DISCONNECTED",
];

export type ProviderSlug =
  | "google-calendar"
  | "google-sheets"
  | "outlook-calendar"
  | "zoom"          // <--- חדש
  | "hubspot"       // <--- חדש
  | "stripe"
  | "paypal"
  | "paybox"
  | "site-link"
  | "zapier"
  | "make";

// הערה: נראה שהוספת 'data' בקובץ connect/page.tsx, אבל לא כאן.
// אם תצטרך לתקן את זה, צריך להוסיף כאן | "data"
export type IntegrationCategoryKey = "calendar" | "payments" | "site" | "integrations" | "data";

export type ConnectMode = "oauth" | "manual" | "coming-soon";

export type ManualField = {
  name: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  type?: "text" | "password" | "url";
  required?: boolean;
};

export type ProviderConfig = {
  slug: ProviderSlug;
  // @ts-ignore - הטיפוס הזה מגיע מ-Prisma וגורם לשגיאות חוזרות
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: IntegrationCategoryKey;
  mode: ConnectMode;
  // ** OAuth specific fields **
  authUrl?: string; 
  tokenUrl?: string; 
  scope?: string; 
  extraAuthParams?: Record<string, string>; 
  // -------------------------
  manualFields?: ManualField[];
  buttonLabel?: string;
  docsUrl?: string;
};

// =========================================================
// CONFIGURATION
// =========================================================

export const PROVIDERS: Record<ProviderSlug, ProviderConfig> = {
  "google-calendar": {
    slug: "google-calendar",
    provider: "GOOGLE_CALENDAR" as any,
    name: "Google Calendar",
    description: "חיבור OAuth מלא ליומן Google לקביעת תורים אוטומטית.",
    category: "calendar",
    mode: "oauth",
    docsUrl: "https://developers.google.com/calendar/api",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  
  "google-sheets": {
    slug: "google-sheets",
    provider: "GOOGLE_SHEETS" as any,
    name: "Google Sheets",
    description: "סנכרון לידים והזמנות ישירות לטבלת אקסל חיה.",
    category: "data", // הוספת data כאן
    mode: "oauth",
    docsUrl: "https://developers.google.com/sheets/api",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },

  "outlook-calendar": {
    slug: "outlook-calendar",
    provider: "OUTLOOK_CALENDAR" as any,
    name: "Outlook Calendar",
    description: "חיבור ליומן Outlook. (בקרוב)",
    category: "calendar",
    mode: "coming-soon",
    docsUrl: "https://learn.microsoft.com/graph/api/resources/calendar",
  },

  // --- תוספת: Zoom ---
  zoom: {
    slug: "zoom",
    provider: "ZOOM" as any, 
    name: "Zoom Meetings",
    description: "יצירת לינקים לפגישות וידאו אוטומטית.",
    category: "calendar",
    mode: "coming-soon", 
    docsUrl: "https://developers.zoom.us/docs/integrations/",
  },

  // --- תוספת: HubSpot ---
  hubspot: {
    slug: "hubspot",
    provider: "HUBSPOT" as any, 
    name: "HubSpot CRM",
    description: "סנכרון לידים ואנשי קשר ל-CRM.",
    category: "integrations",
    mode: "coming-soon",
    docsUrl: "https://developers.hubspot.com/docs/api/overview",
  },

  stripe: {
    slug: "stripe",
    provider: "STRIPE" as any,
    name: "Stripe Connect",
    description: "תשלום מאובטח דרך Stripe. FlowBot יוצר חיובים וקישורים.",
    category: "payments",
    mode: "oauth",
    docsUrl: "https://stripe.com/docs/connect",
    authUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    scope: "read_write",
  },
  paypal: {
    slug: "paypal",
    provider: "PAYPAL" as any,
    name: "PayPal",
    description: "הזנת Client ID + Secret ליצירת קישור תשלום אוטומטי.",
    category: "payments",
    mode: "manual",
    manualFields: [
      {
        name: "clientId",
        label: "Client ID",
        placeholder: "AdVn5...abc",
        required: true,
      },
      {
        name: "clientSecret",
        label: "Client Secret",
        placeholder: "EUKB...xyz",
        required: true,
        type: "password",
      },
    ],
    buttonLabel: "שמור פרטי PayPal",
    docsUrl: "https://developer.paypal.com/api/rest/",
  },
  paybox: {
    slug: "paybox",
    provider: "PAYBOX" as any,
    name: "PayBox",
    description: "הדבק כתובת PayBox / Bit / Tranzila כדי לשלוח ללקוחות.",
    category: "payments",
    mode: "manual",
    manualFields: [
      {
        name: "paymentUrl",
        label: "קישור תשלום",
        type: "url",
        placeholder: "https://payboxapp.page.link/...",
        required: true,
      },
    ],
    buttonLabel: "שמור קישור תשלום",
  },
  "site-link": {
    slug: "site-link",
    provider: "SITE_LINK" as any,
    name: "אתר / טופס",
    description: "הפניה לאתר, Typeform, Google Form או דף נחיתה.",
    category: "site",
    mode: "manual",
    manualFields: [
      {
        name: "url",
        label: "קישור יעד",
        placeholder: "https://example.com/booking",
        type: "url",
        required: true,
      },
    ],
    buttonLabel: "שמור קישור",
  },
  zapier: {
    slug: "zapier",
    provider: "ZAPIER" as any,
    name: "Zapier Webhook",
    description: "FlowBot שולח נתונים לזאפ באמצעות Webhook מוכן.",
    category: "integrations",
    mode: "manual",
    manualFields: [
      {
        name: "webhookUrl",
        label: "Zapier Webhook URL",
        type: "url",
        placeholder: "https://hooks.zapier.com/hooks/catch/...",
        required: true,
        helperText: "צור Catch Hook ב-Zapier והעתק את הקישור לכאן.",
      },
    ],
    buttonLabel: "שמור Webhook",
    docsUrl: "https://platform.zapier.com/docs/triggers#catch-hooks",
  },
  make: {
    slug: "make",
    provider: "MAKE" as any,
    name: "Make.com",
    description: "שילוב עם תרחיש Make באמצעות Webhook מותאם.",
    category: "integrations",
    mode: "manual",
    manualFields: [
      {
        name: "webhookUrl",
        label: "Make Webhook URL",
        type: "url",
        placeholder: "https://hook.us1.make.com/...",
        required: true,
      },
    ],
    buttonLabel: "שמור Webhook",
    docsUrl: "https://www.make.com/en/help/tools/webhooks/webhooks",
  },
};

export const PROVIDER_GROUPS: {
  key: IntegrationCategoryKey;
  title: string;
  description: string;
  providerSlugs: ProviderSlug[];
}[] = [
  {
    key: "calendar",
    title: "ניהול וארגון",
    description: "סנכרון יומנים ופגישות",
    providerSlugs: ["google-calendar", "outlook-calendar", "zoom"], // שינוי: Sheets עבר ל-Data
  },
  {
    key: "data", // הוספת קבוצת Data
    title: "נתונים וגיליונות",
    description: "חיבור למקורות מידע ואחסון נתונים.",
    providerSlugs: ["google-sheets"],
  },
  {
    key: "payments",
    title: "תשלום מהיר",
    description: "שליחת לינקי תשלום וחיוב לקוחות.",
    providerSlugs: ["stripe", "paypal", "paybox"],
  },
  {
    key: "site",
    title: "אתר / טפסים",
    description: "העברת לקוחות לעמודים חיצוניים.",
    providerSlugs: ["site-link"],
  },
  {
    key: "integrations",
    title: "אינטגרציות ואוטומציות",
    description: "חיבור ל-CRM וכלי אוטומציה.",
    providerSlugs: ["make", "zapier", "hubspot"], 
  },
];

export function providerFromSlug(slug: string | null | undefined): ProviderConfig | null {
  if (!slug) return null;
  return (PROVIDERS as Record<string, ProviderConfig>)[slug] ?? null;
}

export function providerFromEnum(enumValue: IntegrationProvider): ProviderConfig {
  const entry = Object.values(PROVIDERS).find((p) => p.provider === enumValue);
  if (!entry) {
    throw new Error(`Unknown provider enum: ${enumValue}`);
  }
  return entry;
}

// =========================================================
// OAUTH LOGIC
// =========================================================

export interface OAuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    metadata?: Record<string, any>;
}

export async function getAccessTokenFromCode(
    params: {
        providerSlug: ProviderSlug;
        code: string;
        redirectUri: string;
        clientId: string;
        clientSecret: string;
    }
): Promise<OAuthTokenResponse> {
    const providerConfig = PROVIDERS[params.providerSlug];
    
    if (providerConfig.mode !== 'oauth' || !providerConfig.tokenUrl) {
         throw new Error(`Provider ${params.providerSlug} is not configured for OAuth token exchange.`);
    }

    const requestBody = new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        code: params.code,
        grant_type: 'authorization_code',
        redirect_uri: params.redirectUri,
    }).toString();

    const res = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
        cache: 'no-store', 
    });

    const data = await res.json() as OAuthTokenResponse & { error?: string, error_description?: string, expires_in?: number };

    if (!res.ok || data.error || !data.access_token) {
        console.error(`Token exchange failed for ${params.providerSlug}:`, data);
        throw new Error(data.error_description || data.error || "Token exchange failed.");
    }
    
    if (params.providerSlug === 'stripe' && (data as any).stripe_user_id) {
         data.metadata = { accountId: (data as any).stripe_user_id };
    }
    
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        metadata: data.metadata,
    };
}
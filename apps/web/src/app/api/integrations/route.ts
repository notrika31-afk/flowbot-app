import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { type ProviderSlug, PROVIDERS } from "@/lib/integrations/providers"; 
import { encrypt } from "@/lib/crypto";

// --- הגדרה זמנית לפיתוח ---
// כשתעלה לפרודקשן, תחליף את זה חזרה ל-getAuthUserFromToken
const DEV_USER_ID = "user_default_dev_123"; 

function mapProviderSlugToPrismaEnum(slug: ProviderSlug): IntegrationProvider | null {
  const provider = PROVIDERS[slug];
  if (!provider) return null;
  return provider.provider;
}

// 1. GET
export async function GET() {
  // מעקף אימות: משתמשים ב-ID קבוע
  const userId = DEV_USER_ID;

  try {
    const integrations = await prisma.integrationConnection.findMany({
      where: { userId: userId },
      select: {
        id: true,
        provider: true,
        status: true,
        metadata: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    
    // ממירים את המערך לאובייקט (Map) כדי שהפרונט יבין
    const integrationsMap = integrations.reduce((acc, curr) => {
        // המרה חזרה ל-Slug (אותיות קטנות) אם צריך, או שימוש ב-provider מה-DB
        // כאן נשתמש בלוגיקה הפוכה פשוטה או נניח שהשמות תואמים
        // לצורך הפשטות נחזיר רשימה, אבל הפרונט שלך מצפה ל-Map.
        // ננסה למצוא את ה-Slug לפי ה-Enum
        const entry = Object.entries(PROVIDERS).find(([key, val]) => val.provider === curr.provider);
        if (entry) {
            acc[entry[0]] = curr;
        }
        return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ integrations: integrationsMap }, { status: 200 });
  } catch (error) {
    console.error("[API/Integrations] GET Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// 2. POST
export async function POST(request: Request) {
  const userId = DEV_USER_ID; // מעקף אימות
  
  try {
    const body = await request.json();
    const providerSlug: ProviderSlug = body.provider;
    let metadata: Record<string, any> = body.metadata || {};
    const status: IntegrationStatus = body.status || IntegrationStatus.CONNECTED;
    
    const providerEnum = mapProviderSlugToPrismaEnum(providerSlug);

    if (!providerEnum) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // הצפנה
    if (metadata.apiKey) metadata.apiKey = encrypt(metadata.apiKey);
    if (metadata.secretKey) metadata.secretKey = encrypt(metadata.secretKey);
    
    const result = await prisma.integrationConnection.upsert({
      where: { 
        userId_provider: { userId, provider: providerEnum }
      },
      update: {
        status: status,
        metadata: metadata,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      },
      create: {
        userId: userId,
        provider: providerEnum,
        status: status,
        metadata: metadata,
      },
      select: {
        id: true,
        provider: true,
        status: true,
        metadata: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, integration: result }, { status: 200 });

  } catch (error) {
    console.error("[API/Integrations] POST Error:", error);
    return NextResponse.json({ error: "Save Error" }, { status: 500 });
  }
}

// 3. DELETE
export async function DELETE(request: Request) {
  const userId = DEV_USER_ID; // מעקף אימות

  try {
    const { provider: providerSlug } = await request.json();
    const providerEnum = mapProviderSlugToPrismaEnum(providerSlug);

    if (!providerEnum) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    await prisma.integrationConnection.delete({
      where: {
        userId_provider: { userId, provider: providerEnum },
      },
    });
    
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    if ((error as any).code === 'P2025') {
        return new NextResponse(null, { status: 204 }); 
    }
    console.error("[API/Integrations] DELETE Error:", error);
    return NextResponse.json({ error: "Delete Error" }, { status: 500 });
  }
}
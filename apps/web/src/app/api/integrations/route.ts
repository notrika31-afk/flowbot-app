import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// התיקון: הסרנו את IntegrationProvider ו-IntegrationStatus
import { type ProviderSlug, PROVIDERS } from "@/lib/integrations/providers"; 
import { encrypt } from "@/lib/crypto";

// --- הגדרה זמנית לפיתוח ---
const DEV_USER_ID = "user_default_dev_123"; 

// שינינו את ערך ההחזרה ל-string | null כדי לא להיות תלויים ב-Enum
function mapProviderSlugToPrismaEnum(slug: ProviderSlug): string | null {
  const provider = PROVIDERS[slug];
  if (!provider) return null;
  return provider.provider as any; // עוקפים את בדיקת הטיפוסים
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
    
    // ממירים את המערך לאובייקט (Map)
    const integrationsMap = integrations.reduce((acc, curr) => {
        // השוואה בטוחה ע"י המרה ל-any
        const entry = Object.entries(PROVIDERS).find(([key, val]) => (val.provider as any) === curr.provider);
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
    
    // התיקון: שימוש בסטרינג רגיל במקום ב-Enum
    const status = body.status || 'CONNECTED';
    
    const providerEnum = mapProviderSlugToPrismaEnum(providerSlug);

    if (!providerEnum) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // הצפנה
    if (metadata.apiKey) metadata.apiKey = encrypt(metadata.apiKey);
    if (metadata.secretKey) metadata.secretKey = encrypt(metadata.secretKey);
    
    const result = await prisma.integrationConnection.upsert({
      where: { 
        userId_provider: { 
            userId, 
            provider: providerEnum as any // שימוש ב-any
        }
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
        provider: providerEnum as any,
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
        userId_provider: { 
            userId, 
            provider: providerEnum as any // שימוש ב-any
        },
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
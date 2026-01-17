"use server";
import { prisma } from "@/lib/prisma"; // וודא שהנתיב ל-prisma נכון

export async function syncWhatsAppTemplates(userId: string) {
  // 1. שליפת פרטי החיבור של המשתמש מה-DB
  const config = await prisma.whatsAppConfig.findUnique({
    where: { userId },
  });

  if (!config || !config.accessToken || !config.wabaId) {
    throw new Error("WhatsApp connection not found");
  }

  // 2. פנייה ל-API של מטא למשיכת תבניות
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${config.wabaId}/message_templates?access_token=${config.accessToken}`
  );

  const data = await response.json();

  if (data.error) {
    console.error("Meta API Error:", data.error);
    throw new Error(data.error.message);
  }

  // 3. עדכון ה-Database (Prisma)
  const templates = data.data;
  
  for (const temp of templates) {
    await prisma.whatsAppTemplate.upsert({
      where: { metaTemplateId: temp.id },
      update: {
        status: temp.status as any,
        content: temp.components,
      },
      create: {
        userId,
        metaTemplateId: temp.id,
        name: temp.name,
        category: temp.category,
        language: temp.language,
        status: temp.status as any,
        content: temp.components,
      },
    });
  }

  return { success: true, count: templates.length };
}

// 📜 ✅ פונקציה חדשה: משיכת תבניות מה-DB המקומי (עבור ה-Review)
// פונקציה זו תוודא שהתבניות שהזרקנו ב-SQL יופיעו בטבלה באתר
export async function getLocalTemplates(userId: string) {
  try {
    const templates = await prisma.whatsAppTemplate.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: templates };
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, data: [] };
  }
}

// 💬 ✅ פונקציה חדשה: שליחת הודעה חיה (Live Messaging)
// פונקציה זו תגרום לכפתור ה-Send בממשק באמת לשלוח הודעה לוואטסאפ שלך
export async function sendLiveMessage(userId: string, to: string, message: string) {
  try {
    const config = await prisma.whatsAppConfig.findUnique({
      where: { userId },
    });

    if (!config || !config.accessToken || !config.phoneNumberId) {
      throw new Error("Missing WhatsApp configuration");
    }

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const result = await response.json();
    
    if (result.error) throw new Error(result.error.message);
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Send Error:", error);
    return { success: false, error: error.message };
  }
}
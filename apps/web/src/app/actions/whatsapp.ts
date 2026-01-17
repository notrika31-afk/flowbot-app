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
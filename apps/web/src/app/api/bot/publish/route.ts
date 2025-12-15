import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; 

// ==============================================================================
// הגדרות אלו מונעות מ-Next.js לנסות להריץ את הקוד בזמן הבנייה
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// ==============================================================================

export async function POST(req: Request) {
  try {
    // 1. זיהוי המשתמש
    const session = await getUserSession();
    
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.id; 

    const body = await req.json();
    const { flow, waba, status } = body;

    // --- שינוי 1: הסרת החסימה הגורפת ---
    // במקום לזרוק שגיאה אם אין waba, אנחנו נבדוק את זה בהמשך.
    console.log("🚀 Publishing Bot for user:", userId);

    // 2. שמירת/עדכון הבוט (התסריט) - נשאר ללא שינוי
    let bot = await prisma.bot.findFirst({
        where: { ownerId: userId }
    });

    if (bot) {
        // עדכון בוט קיים
        bot = await prisma.bot.update({
            where: { id: bot.id },
            data: {
                flowData: flow, 
                publishedAt: new Date(),
                status: status || 'ACTIVE'
            }
        });
    } else {
        // יצירת בוט חדש
        bot = await prisma.bot.create({
            data: {
                ownerId: userId,
                name: "My Business Bot",
                flowData: flow,
                status: status || 'ACTIVE',
                publishedAt: new Date()
            }
        });
    }

    // 3. טיפול בחיבור הוואטסאפ (Logic חדש התומך בשני המצבים)

    if (waba && waba.phoneId && waba.token) {
        // === תרחיש A: קיבלנו פרטים ידנית (כמו קודם) ===
        // נשמור או נעדכן אותם בדיוק כמו בקוד המקורי
        
        const existingConnection = await prisma.whatsAppConnection.findFirst({
            where: { userId: userId, phoneNumberId: waba.phoneId }
        });

        if (existingConnection) {
            await prisma.whatsAppConnection.update({
                where: { id: existingConnection.id },
                data: {
                    wabaId: waba.wabaId,
                    accessToken: waba.token,
                    isActive: true,
                    botId: bot.id 
                }
            });
        } else {
            await prisma.whatsAppConnection.create({
                data: {
                    userId: userId,
                    phoneNumberId: waba.phoneId,
                    wabaId: waba.wabaId,
                    accessToken: waba.token,
                    isActive: true,
                    botId: bot.id
                }
            });
        }

    } else {
        // === תרחיש B: לא קיבלנו פרטים (חיבור אוטומטי/פייסבוק) ===
        // נחפש אם יש חיבור קיים למשתמש בדאטה-בייס
        
        const existingConnection = await prisma.whatsAppConnection.findFirst({
            where: { userId: userId },
            orderBy: { updatedAt: 'desc' } // לוקחים את החיבור האחרון שהיה פעיל
        });

        if (!existingConnection) {
            // אם אין פרטים ב-Body וגם לא מצאנו כלום בדאטה-בייס -> אז זו שגיאה
            return NextResponse.json({ error: "No WhatsApp connection found. Please connect with Facebook first." }, { status: 400 });
        }

        // אם מצאנו חיבור, רק נקשר אותו לבוט החדש/המעודכן
        await prisma.whatsAppConnection.update({
            where: { id: existingConnection.id },
            data: {
                botId: bot.id,
                isActive: true
            }
        });
        
        console.log("🔗 Linked existing connection to bot");
    }

    console.log("✅ Bot Published Successfully!");

    return NextResponse.json({ success: true, botId: bot.id }, { status: 200 });

  } catch (error: any) {
    console.error("Publish API Error:", error);
    return NextResponse.json({ error: "Server Error", details: error.message }, { status: 500 });
  }
}
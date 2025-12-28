import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; 

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.id; 
    const body = await req.json();
    const { flow, waba, status } = body;

    // --- תיקון 1: וידוא פורמט ה-JSON (למניעת הבעיה בתמונה) ---
    // אנחנו מוודאים שה-flow נשמר כאובייקט ולא כטקסט, כדי שהסימולציה תעבוד
    const parsedFlow = typeof flow === 'string' ? JSON.parse(flow) : flow;

    console.log("🚀 Publishing Bot for user:", userId);

    // 2. שמירת/עדכון הבוט (התסריט)
    let bot = await prisma.bot.findFirst({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' } // מבטיח שאנחנו על הבוט הנכון
    });

    if (bot) {
        // עדכון בוט קיים
        bot = await prisma.bot.update({
            where: { id: bot.id },
            data: {
                // הגנה: אם parsedFlow ריק (null), אנחנו שומרים על המידע הקיים ב-DB ולא מוחקים אותו
                flowData: parsedFlow || bot.flowData, 
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
                flowData: parsedFlow,
                status: status || 'ACTIVE',
                publishedAt: new Date()
            }
        });
    }

    // 3. טיפול בחיבור הוואטסאפ (הלוגיקה המקורית שלך נשמרה לגמרי)
    if (waba && waba.phoneId && waba.token) {
        // === תרחיש A: פרטים ידנית ===
        const existingConnection = await prisma.wabaConnection.findFirst({
            where: { userId: userId, phoneNumberId: waba.phoneId }
        });

        if (existingConnection) {
            await prisma.wabaConnection.update({
                where: { id: existingConnection.id },
                data: {
                    wabaId: waba.wabaId,
                    accessToken: waba.token,
                    isActive: true,
                    botId: bot.id 
                }
            });
        } else {
            await prisma.wabaConnection.create({
                data: {
                    userId: userId,
                    phoneNumberId: waba.phoneId,
                    wabaId: waba.wabaId,
                    accessToken: waba.token,
                    isActive: true,
                    botId: bot.id,
                    verifyToken: "flowbot_verify_token" // שדה חובה ב-Schema שלך
                }
            });
        }

    } else {
        // === תרחיש B: חיבור אוטומטי/פייסבוק ===
        const existingConnection = await prisma.wabaConnection.findFirst({
            where: { userId: userId },
            orderBy: { updatedAt: 'desc' }
        });

        if (!existingConnection) {
            return NextResponse.json({ error: "No WhatsApp connection found. Please connect with Facebook first." }, { status: 400 });
        }

        await prisma.wabaConnection.update({
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
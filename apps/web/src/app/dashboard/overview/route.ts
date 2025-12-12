import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { getAuthUserFromToken } from "@/lib/auth";

// ==============================================================================
// התיקון: הגדרות אלו מונעות מ-Next.js לנסות להריץ את הקוד בזמן הבנייה
// זה פותר את השגיאה Failed to collect page data
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// ==============================================================================

export async function GET() {
  try {
    // 1. זיהוי המשתמש
    // התיקון: הוספנו await כאן
    const user = await getAuthUserFromToken();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. שליפת נתונים במקביל (יעיל יותר)
    const [activeBots, totalContacts, totalMessages, activeAutomations] = await Promise.all([
      // כמה בוטים יש למשתמש?
      prisma.bot.count({
        where: { ownerId: user.id, isActive: true }
      }),
      
      // כמה לידים/אנשי קשר נאספו? (הטבלה החדשה Contact)
      prisma.contact.count({
        where: { bot: { ownerId: user.id } }
      }),

      // כמה הודעות נשלחו/התקבלו?
      prisma.message.count({
        where: { bot: { ownerId: user.id } }
      }),

      // כמה אוטומציות (Flows) פעילות?
      prisma.flow.count({
        where: { bot: { ownerId: user.id }, isPublished: true }
      })
    ]);

    // 3. החזרת התשובה לדשבורד
    return NextResponse.json({
      activeBots,
      activeAutomations, 
      newLeads: totalContacts, // מיפוי לשם שהדשבורד מצפה לו
      totalMessages
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

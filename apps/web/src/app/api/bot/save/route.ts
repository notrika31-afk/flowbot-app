import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // הוספתי כאן את businessDescription שיישלח מה-Frontend
    const { userId, name, category, flow_json, businessDescription } = data;

    if (!userId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. עדכון ה"שכל" של העסק בטבלת המשתמש (אם נשלח כזה)
    if (businessDescription !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { businessDescription: businessDescription },
      });
      console.log(`✅ Updated business knowledge for user: ${userId}`);
    }

    // 2. יצירת הבוט (הקוד המקורי שלך ללא שינוי בשמות השדות)
    const bot = await prisma.bot.create({
      data: {
        ownerId: userId,      
        name,
        flowData: flow_json,  
        status: "draft",
        // category: category, // ניתן להחזיר אם הוספת את השדה לסכמה
      },
    });

    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error("❌ Save Bot Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
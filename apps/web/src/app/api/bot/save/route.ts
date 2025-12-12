import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // תיקון 1: שימוש במופע המרכזי

// ==============================================================================
// תיקון קריטי לשגיאת Build:
// הגדרות אלו מונעות מ-Next.js לנסות להריץ את הקוד בזמן הבנייה
// ומחייבות שימוש בסביבת Node.js יציבה עבור Prisma.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// ==============================================================================

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { userId, name, category, flow_json } = data;

    if (!userId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bot = await prisma.bot.create({
      data: {
        ownerId: userId,      // תיקון 2: השדה בסכמה הוא ownerId
        name,
        // category,          // שים לב: אם השדה category לא קיים בסכמה, תמחק את השורה הזו
        flowData: flow_json,  // תיקון 3: השדה בסכמה הוא flowData
        status: "draft",
        // connected: false,  // תיקון 4: שדות אלו כנראה לא בסכמה ולכן הוסתרו
        // active: false,
      },
    });

    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

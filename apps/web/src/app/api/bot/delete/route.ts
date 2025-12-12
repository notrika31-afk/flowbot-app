import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // התיקון: שימוש במופע המרכזי
import { getUserSession } from "@/lib/auth";

// ==============================================================================
// תיקון קריטי לשגיאת Build:
// הגדרות אלו מונעות מ-Next.js לנסות להריץ את הקוד בזמן הבנייה
// ומחייבות שימוש בסביבת Node.js יציבה עבור Prisma.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// ==============================================================================

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
        return NextResponse.json({ error: "Missing bot ID" }, { status: 400 });
    }

    // מחיקת הבוט (רק אם הוא שייך למשתמש)
    await prisma.bot.deleteMany({
      where: {
        id: id,
        ownerId: session.id
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete bot" }, { status: 500 });
  }
}

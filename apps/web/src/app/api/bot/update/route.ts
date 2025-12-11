import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // התיקון: שימוש במופע המרכזי

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const { id, name, category, flow_json, status, connected, active } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing bot ID" }, { status: 400 });
    }

    const bot = await prisma.bot.update({
      where: { id },
      data: { 
        name, 
        // category,          // הוסתר כי כנראה לא קיים בסכמה
        flowData: flow_json,  // התיקון: המיפוי הנכון לשדה flowData
        status, 
        // connected,         // הוסתר כי כנראה לא קיים בסכמה
        // active             // הוסתר כי כנראה לא קיים בסכמה
      },
    });

    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
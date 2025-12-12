// app/api/knowledge/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, question } = body;

    if (!businessId || !question) {
      return NextResponse.json(
        { error: "missing businessId or question" },
        { status: 400 }
      );
    }

    // התיקון: העברת הפרמטרים בנפרד (שאלה, ואז מזהה עסק)
    const matches = await searchKnowledge(question, businessId);

    return NextResponse.json({ matches });
  } catch (err: any) {
    console.error("knowledge/query error:", err);
    return NextResponse.json(
      { error: "internal error", message: err?.message },
      { status: 500 }
    );
  }
}
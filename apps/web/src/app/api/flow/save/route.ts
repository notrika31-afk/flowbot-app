import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // דמו: מחזיר הצלחה תמיד
  await req.json().catch(() => null);
  return NextResponse.json({ ok: true });
}
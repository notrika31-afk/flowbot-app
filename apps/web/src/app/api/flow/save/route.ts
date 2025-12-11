import { NextResponse } from "next/server";
export async function POST(req: Request) {
  // דמו: מחזיר הצלחה תמיד
  await req.json().catch(() => null);
  return NextResponse.json({ ok: true });
}
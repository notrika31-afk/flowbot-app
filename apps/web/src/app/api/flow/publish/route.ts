import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // דמו: כאן נחבר בהמשך ל-DB/Stripe/WhatsApp API
  await req.json().catch(() => null);
  return NextResponse.json({ ok: true, message: "published_demo" });
}
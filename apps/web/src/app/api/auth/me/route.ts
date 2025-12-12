import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = cookies().get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    // התיקון הקריטי עדיין נשמר: await
    // עוטפים ב-try/catch למקרה ש-verifyToken נכשלת עם שגיאת Build פנימית
    payload = await verifyToken(token);
  } catch (err) {
    console.error("Token verification failed during runtime:", err);
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  
  // בדיקה קפדנית יותר ל-payload
  if (!payload || typeof payload !== 'object' || !('userId' in payload)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (payload as { userId: string }).userId }, // משתמשים ב-Type Assertion בטוח יותר
      select: {
        id: true,
        email: true,
        phone: true,
        bots: {
          select: { id: true },
        },
        integrations: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      botsCount: user.bots.length,
      integrationsCount: user.integrations.length,
    });
  } catch (err) {
    console.error("ME DB ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
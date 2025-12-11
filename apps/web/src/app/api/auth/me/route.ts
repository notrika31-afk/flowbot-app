import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const token = cookies().get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // התיקון הקריטי: הוספת await לפני verifyToken
    const payload = await verifyToken(token);
    
    if (!payload?.userId) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
    console.error("ME ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bot = await prisma.bot.findUnique({
      where: { id: params.id },
      include: {
        connections: true,
        messages: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromToken } from "@/lib/auth";

export async function GET() {
  try {
    const user = getAuthUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bots = await prisma.bot.findMany({
      where: { ownerId: user.id },
      include: {
        messages: {
          select: { id: true },
        },
        flows: {
          select: { id: true },
        },
        whatsappConnections: {
          select: {
            isActive: true,
            phoneNumberId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      description: bot.description || "",
      createdAt: bot.createdAt,
      messagesCount: bot.messages.length,
      flowsCount: bot.flows.length,
      whatsappActive:
        bot.whatsappConnections.length > 0 &&
        bot.whatsappConnections[0].isActive,
    }));

    return NextResponse.json({ bots: formatted });
  } catch (err) {
    console.error("BOTS LIST ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
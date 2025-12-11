import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { userId, name, category, flow_json } = data;

    if (!userId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bot = await prisma.bot.create({
      data: {
        userId,
        name,
        category,
        flow_json,
        status: "draft",
        connected: false,
        active: false,
      },
    });

    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
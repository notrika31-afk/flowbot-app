import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getUserSession();
    if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbIntegrations = await prisma.integrationConnection.findMany({
      where: { userId: session.id },
    });

    const integrationsMap = dbIntegrations.reduce((acc: any, item) => {
      acc[item.provider] = item;
      return acc;
    }, {});

    return NextResponse.json({ integrations: integrationsMap });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getUserSession();
    const { provider } = await req.json();

    await prisma.integrationConnection.delete({
      where: {
        userId_provider: {
          userId: session?.id!,
          provider: provider,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
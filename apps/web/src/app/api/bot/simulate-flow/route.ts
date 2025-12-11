import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { flow } = await req.json();

    if (!flow || !Array.isArray(flow.steps)) {
      return NextResponse.json(
        { error: "invalid_flow" },
        { status: 400 }
      );
    }

    const steps = flow.steps;
    const map = new Map(steps.map((s: any) => [s.id, s]));

    let current = map.get("start") || steps[0];
    const preview: string[] = [];

    while (current) {
      preview.push(`📩 ${current.title}`);

      if (current.content) preview.push(current.content);

      if (current.buttons?.length) {
        const btns = current.buttons.map((b: any) => b.label).join(", ");
        preview.push(`כפתורים: ${btns}`);
      }

      if (!current.next) break;
      current = map.get(current.next);
    }

    return NextResponse.json({ preview });

  } catch (err: any) {
    return NextResponse.json(
      { error: "simulate_error", details: String(err) },
      { status: 500 }
    );
  }
}
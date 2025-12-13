import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const client = new OpenAI({ apiKey: process.env.GOOGLE_API_KEY! });

    const { flow, request } = await req.json();
    if (!flow?.steps?.length || !request) {
      return NextResponse.json({ error: "missing flow/request" }, { status: 400 });
    }

    const system = `
אתה FlowBot. קבל Flow (JSON) ובקשת שינוי קצרה, החזר Flow חדש (JSON) בלבד.
שמור את המבנה, קצרים ותכליתיים, עדכן רק היכן שנדרש.
`.trim();

    const messages = [
      { role: "system" as const, content: system },
      { role: "user" as const, content: "Flow קיים:\n" + JSON.stringify(flow, null, 2) },
      { role: "user" as const, content: "בקשת שינוי:\n" + String(request) }
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages,
      max_tokens: 900,
      response_format: { type: "json_object" } as any
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    const updated = JSON.parse(content);
    if (!updated?.steps?.length) {
      return NextResponse.json({ error: "refine_failed" }, { status: 500 });
    }

    return NextResponse.json({ flow: updated });
  } catch (e) {
    return NextResponse.json({ error: "server_error", details: String(e) }, { status: 500 });
  }
}
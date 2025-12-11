import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type FlowButton = { label: string; next?: string };
type FlowStep = {
  id: string;
  type: "start" | "message" | "ai" | "buttons" | "condition" | "delay" | "http" | "end";
  title: string;
  content?: string;
  buttons?: FlowButton[];
  next?: string;
};
type Flow = { goal: string; channel?: "whatsapp"; steps: FlowStep[] };

export async function POST(req: Request) {
  try {
    const { business } = await req.json();

    if (!business || typeof business !== "string") {
      return NextResponse.json({ error: "missing business" }, { status: 400 });
    }

    const system = `
אתה FlowBot. צור תסריט וואטסאפ מלא (Flow) לעסק לפי התיאור.
כללים:
- החזר JSON *בלבד* בתוך תגובה, ללא טקסט נוסף.
- מבנה: { "goal": "", "channel":"whatsapp", "steps":[{ id, type, title, content?, buttons?, next? }] }
- השתמש ב-id פשוטים: "step_1","step_2", ...
- שמור תסריט קצר וממוקד: 6–9 צעדים.
- בצע שימוש חכם ב-buttons היכן שטבעי (בחירה מהירה).
- הימנע מטקסטים ארוכים.
`.trim();

    const user = `תיאור העסק: ${business}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 900,
      response_format: { type: "json_object" } as any
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    let flow: Flow | null = null;
    try { flow = JSON.parse(content) as Flow; } catch {}

    if (!flow?.steps?.length) {
      return NextResponse.json({ error: "failed_to_build_flow" }, { status: 500 });
    }

    return NextResponse.json({ flow });
  } catch (err) {
    return NextResponse.json({ error: "server_error", details: String(err) }, { status: 500 });
  }
}
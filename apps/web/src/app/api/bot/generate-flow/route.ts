import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Answers = {
  category?: string;
  services?: string;
  tone?: "רשמי" | "חברי" | "קליל";
  booking?: boolean;
  payments?: boolean;
  hours?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, answers, goal } = body as {
      message?: string;
      answers?: Answers;
      goal?: string;
    };

    // נאפשר גם message (למקרה הישן), וגם answers (החדש)
    if ((!answers || typeof answers !== "object") && (!message || typeof message !== "string")) {
      return NextResponse.json({ error: "missing_message_or_answers" }, { status: 400 });
    }

    const a = answers || {};
    const summary = `
סיכום לקליטה מהלקוח:
- קטגוריה: ${a.category ?? "לא צוין"}
- מה העיקר: ${a.services ?? "לא צוין"}
- טון דיבור: ${a.tone ?? "קליל"}
- קביעת תורים: ${a.booking ? "כן" : "לא"}
- תשלומים: ${a.payments ? "כן" : "לא"}
- שעות פעילות: ${a.hours ?? "לא צוין"}
    `.trim();

    const system = `
אתה FlowBot — מומחה בבניית תסריטי וואטסאפ לעסקים.
מטרה: להחזיר JSON תקין בלבד (בלי טקסט לפני/אחרי), עם Flow קצר וברור.
כלול:
- start (ברוך הבא, מותאם לעסק)
- תפריט buttons עם 3-5 אפשרויות רלוונטיות
- ענפים בסיסיים (למשל book/info/pricing/contact)
- הודעות מותאמות (כולל שעות ותמחור אם צוין)
- אל תחזיר שום דבר חוץ מ-JSON ב- \`\`\`json ... \`\`\`

דוגמת מבנה:
{
  "goal": "בוט וואטסאפ לעסק X",
  "steps": [
    { "id": "start", "type": "start", "title": "ברוך הבא!", "content": "ברוך הבא לעסק X", "next": "menu" },
    { "id": "menu", "type": "buttons", "title": "איך אפשר לעזור?", "buttons": [
      { "label": "קביעת תור", "go": "book" },
      { "label": "מידע", "go": "info" },
      { "label": "מחירים", "go": "pricing" }
    ]},
    { "id": "book", "type": "message", "title": "קביעת תור", "content": "נשמח לקבוע — כתוב תאריך/שעה מועדפים." },
    { "id": "info", "type": "message", "title": "מידע", "content": "שעות פעילות: ... ; כתובת: ... ; פרטים נוספים: ..." },
    { "id": "pricing", "type": "message", "title": "מחירים", "content": "טווח מחירים: ... ; מבצע/חבילות: ..." }
  ]
}
    `.trim();

    const user = `
${summary}

${message ? `תוספת הודעה חופשית: ${message}` : ""}

בנה עכשיו Flow JSON בלבד, מותאם אישית. goal: ${goal || `בוט וואטסאפ לעסק ${a.category ?? ""}`}.
    `.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 700,
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i);
    if (!jsonMatch) {
      return NextResponse.json({ error: "invalid_json", raw }, { status: 400 });
    }

    const flow = JSON.parse(jsonMatch[1]);
    return NextResponse.json({ flow });
  } catch (err) {
    return NextResponse.json({ error: "server_error", details: String(err) }, { status: 500 });
  }
}
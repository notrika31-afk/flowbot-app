import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const client = new OpenAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const { history = [] } = await req.json();

    if (!Array.isArray(history)) {
      return NextResponse.json({ error: "invalid_history" }, { status: 400 });
    }

    const system = `
אתה FlowBot — יועץ על שבונה בוטי WhatsApp לעסקים מכל סוג.

מטרתך:
1. לנהל שיחה טבעית עם בעל העסק.
2. להבין את מטרת הבוט והעסק.
3. לשאול שאלות *רק אם צריך*.
4. לבנות בסוף תסריט מלא בפורמט JSON.

התנהגות:
- אל תשאל שאלות קבועות מראש.
- תמיד תשאל שאלה רק אחרי מה שהלקוח כתב.
- דבר בשפה טבעית, כמו איש מכירות מדהים.
- תדע להציע רעיונות שהלקוח לא חשב עליהם.
- אם הלקוח כבר סיפר מספיק — אל תמשיך לשאול. תבנה Flow.
- Flow צריך להיות מלא, עם טריגרים, כפתורים, טקסטים, מסלולים.

מבנה ה־Flow שאתה מחזיר (כאשר מוכן):
\`\`\`json
{
  "ready": true,
  "flow": {
    "trigger_words": ["..."],
    "steps": [
      {
        "id": "start",
        "type": "start",
        "title": "ברוך הבא",
        "content": "ברוך הבא לעסק...",
        "next": "menu"
      },
      {
        "id": "menu",
        "type": "buttons",
        "title": "איך אפשר לעזור?",
        "buttons": [
          { "label": "קביעת תור", "go": "book" }
        ]
      }
    ]
  }
}
\`\`\`

אם עדיין אין מספיק מידע — אל תחזיר JSON.  
תחזיר רק משפט אחד או שניים ושאלה המשך מתאימה.

לעולם אל תעבור לייצר Flow אם חסר מידע חיוני.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...history.map((m: any) => ({
          role: m.role,
          content: m.text,
        })),
      ],
      temperature: 0.4,
    });

    let content = completion.choices?.[0]?.message?.content || "";

    // אם ה-AI מחזיר JSON — נזהה אותו
    const match = content.match(/```json([\s\S]*?)```/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      return NextResponse.json(parsed);
    }

    // אחרת — זו תגובת המשך רגילה
    return NextResponse.json({
      ready: false,
      reply: content,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", details: String(err) },
      { status: 500 }
    );
  }
}
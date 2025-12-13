// apps/web/src/app/api/bot/coach/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

// ננהל זיכרון קצר ב־RAM לפי sessionId (לדמו מקומי)
const memory: Record<
  string,
  {
    answers: Record<string, any>;
    askedKeys: string[];
    done: boolean;
  }
> = {};

const QUESTIONS: { key: string; q: string; tip?: string }[] = [
  { key: "category", q: "מה סוג העסק? (לדוגמה: חדר כושר / לק ג׳ל / קליניקה / מסעדה)" },
  { key: "goal", q: "מה המטרה המרכזית של הבוט? (קביעת תורים / מכירה / מענה / תמיכה)" },
  { key: "audience", q: "מי קהל היעד העיקרי? (גיל/מאפיינים בקצרה)" },
  { key: "tone", q: "באיזה טון דיבור להעדיף? (קליל / חברי / רשמי)" },
  { key: "booking", q: "צריך תיאום תורים? (כן/לא, ואם כן—ימים/שעות בקצרה)" },
  { key: "payments", q: "צריך גם גבייה? (כן/לא)" },
];

function nextMissingKey(answers: Record<string, any>, askedKeys: string[]) {
  for (const q of QUESTIONS) {
    if (answers[q.key] === undefined && !askedKeys.includes(q.key)) return q;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const client = new OpenAI({
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const body = await req.json();
    const { sessionId = "default", message } = body || {};

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "missing_message" }, { status: 400 });
    }

    if (!memory[sessionId]) {
      memory[sessionId] = { answers: {}, askedKeys: [], done: false };
    }
    const state = memory[sessionId];

    // ננסה להבין אם ההודעה עונה על שאלה קודמת או נותנת מידע כללי
    // נבקש מהמודל למפות את הטקסט לשדות המוכרים שלנו.
    const mappingSystem = `
אתה ממפה טקסט חופשי לשדות קצרים עבור בוט לעסק.
החזר JSON בלבד ללא טקסט חיצוני.
שדות:
- category (string)
- goal (string)
- audience (string)
- tone ("קליל"|"חברי"|"רשמי"|string קצר)
- booking (boolean|string קצר אם פרט שעות)
- payments (boolean)
אם אין מידע לשדה—אל תחזיר אותו.
`.trim();

    const mapResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: mappingSystem },
        { role: "user", content: message },
      ],
    });

    let mapped = mapResp.choices?.[0]?.message?.content?.trim() || "{}";
    // ננסה להסיר פנסינג במידה והמודל החזיר ```json
    const m = mapped.match(/```json([\s\S]*?)```/i);
    if (m) mapped = m[1].trim();

    let patch: Record<string, any> = {};
    try {
      patch = JSON.parse(mapped);
    } catch {
      patch = {};
    }

    // נעדכן תשובות שאינן ריקות
    for (const [k, v] of Object.entries(patch)) {
      if (v !== null && v !== undefined && `${v}`.trim() !== "") {
        state.answers[k] = v;
      }
    }

    // אם יש עדיין חסרים—נשאל שאלה אחת בלבד
    const missing = nextMissingKey(state.answers, state.askedKeys);
    if (missing) {
      state.askedKeys.push(missing.key);
      return NextResponse.json({
        type: "question",
        question: missing.q,
        answers: state.answers,
        progress: {
          asked: state.askedKeys.length,
          total: QUESTIONS.length,
        },
        hint: missing.tip || null,
      });
    }

    // אחרת—אנחנו מוכנים לבנות FLOW
    if (!state.done) {
      state.done = true;
      const buildSystem = `
אתה FlowBot – בונה תסריטי וואטסאפ.
החזר JSON נקי בלבד, ללא טקסט נוסף, לפי המפרט.
השתמש במזהים פשוטים: "start", "menu", "book", "info", "pricing", "end".
`.trim();

      const spec = {
        goal: `בוט וואטסאפ לעסק מסוג ${state.answers.category || "עסק"}`,
        answers: state.answers,
        schema: {
          steps: [
            { id: "start", type: "start", title: "ברוך הבא!", content: "ברוך הבא ל{שם העסק}! איך אפשר לעזור?" },
            {
              id: "menu",
              type: "buttons",
              title: "בחר אפשרות",
              buttons: [
                { label: "קביעת תור", go: "book" },
                { label: "מידע", go: "info" },
                { label: "מחירים", go: "pricing" },
              ],
            },
            { id: "book", type: "ai", title: "תיאום תור", content: "איסוף פרטים, תאריך, שעה, אימות." },
            { id: "info", type: "message", title: "מידע על העסק", content: "שעות פעילות, שירותים, כתובת/קישור." },
            { id: "pricing", type: "message", title: "מחירון", content: "טווח מחירים/חבילות בתמצית." },
            { id: "end", type: "end", title: "סיום", content: "תודה! לכל שאלה—אנחנו כאן." },
          ],
        },
        rules: [
          "התאם את הטקסטים, הטון והכפתורים לפי הנתונים שקיבלת",
          "אם business דורש תורים—סעיף 'book' חייב להיות פעיל וממוקד",
          "אל תחזיר טקסט לפני/אחרי ה־JSON",
        ],
      };

      const buildResp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: buildSystem },
          { role: "user", content: JSON.stringify(spec, null, 2) },
        ],
      });

      let raw = buildResp.choices?.[0]?.message?.content?.trim() || "{}";
      const mm = raw.match(/```json([\s\S]*?)```/i);
      if (mm) raw = mm[1].trim();

      let flow: any = null;
      try {
        flow = JSON.parse(raw);
      } catch {
        // fallback: נעטוף אם המודל החזיר רק steps
        try {
          const stepsOnly = JSON.parse(raw);
          flow = { goal: spec.goal, steps: stepsOnly.steps || stepsOnly };
        } catch {
          return NextResponse.json({ error: "flow_parse_error", raw }, { status: 500 });
        }
      }

      return NextResponse.json({
        type: "flow_ready",
        flow: {
          goal: spec.goal,
          business: {
            category: state.answers.category,
            tone: state.answers.tone,
            booking: !!state.answers.booking,
            payments: !!state.answers.payments,
            audience: state.answers.audience || "",
          },
          steps: flow.steps || flow,
        },
      });
    }

    // כבר בנינו
    return NextResponse.json({
      type: "done",
      message: "Flow כבר נבנה לשיחה זו.",
      answers: state.answers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "server_error", details: String(err) }, { status: 500 });
  }
}
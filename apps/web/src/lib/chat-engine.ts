// src/lib/chat-engine.ts

import { openai } from "./config";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";

// -----------------------------
// STATE INTERFACE
// -----------------------------
export interface ChatState {
  mode: "advisor" | "builder" | null;     // current mode
  businessType?: string;                  // type of business (nails, lawyer…)
  missingInfo: string[];                  // what we still need to build flow
  collected: Record<string, any>;         // collected user data
  history: ChatCompletionMessageParam[];  // LLM conversation
}

// -----------------------------
// INITIAL SYSTEM PROMPT
// -----------------------------
const SYSTEM_PROMPT = `
אתה FlowBot — מנוע AI חכם לבניית תסריטי WhatsApp ולמתן רעיונות לעסקים.

יש לך שני מצבים:
1. Advisor Mode – מתן רעיונות, השראה והכוונה.
2. Builder Mode – בניית Flow מלא לאחר איסוף מידע.

אתה מזהה לבד לפי הודעת המשתמש אם הוא:
• רוצה רעיונות → Advisor Mode  
• רוצה להתחיל לבנות בוט → Builder Mode

כללים:
• אתה מבין עברית, סלנג, שגיאות כתיב והקשרים.
• אתה מנתח Intent בכל הודעה.
• אתה שומר State.
• תשובות חייבות להיות ברורות, קצרות, מדויקות וממוספרות.
• ב־Advisor Mode נותן עד 5 רעיונות, כל רעיון במבנה:
  1. כותרת רעיון
  2. מה הוא עושה
  3. איך הוא עוזר לעסק
  4. איך הבוט מפעיל אותו
• ב־Builder Mode שואל שאלות חסר בלבד.
• כשיש מספיק מידע → תחזיר רק JSON בתוך בלוק json.
• JSON הוא Flow מלא, בלי טקסט נוסף לפני/אחרי.
• אתה יודע להבין תאריכים, שעות, שירותים, כוונות והקשר.
• אתה יודע לבצע fallback: אם לא ברור – שאל שאלה אחת קצרה.

אל תחזור על עצמך.
אל תכתוב טקסט ארוך מדי.
`;


// -----------------------------
// INTENT DETECTION
// -----------------------------
function detectIntent(message: string): "advisor" | "builder" | "unknown" {
  const msg = message.toLowerCase();

  const advisorKeywords = [
    "רעיון",
    "רעיונות",
    "מה אפשר לעשות",
    "תן לי כיוון",
    "תן השראה",
    "מה הבוט יכול לעשות",
    "חדשנות",
    "שיפור"
  ];

  const builderKeywords = [
    "בנה לי",
    "בוא נבנה",
    "flow",
    "תסריט",
    "start",
    "אני רוצה בוט",
    "אני צריך בוט",
    "תתחיל לבנות",
    "סימולציה"
  ];

  if (advisorKeywords.some(k => msg.includes(k))) return "advisor";
  if (builderKeywords.some(k => msg.includes(k))) return "builder";

  return "unknown";
}


// -----------------------------
// CHECK IF FLOW CAN BE BUILT
// -----------------------------
function hasEnoughInfo(state: ChatState) {
  return (
    state.businessType &&
    Object.keys(state.collected).length >= 2 && // at least service + purpose
    state.missingInfo.length === 0
  );
}


// -----------------------------
// BUILD FLOW JSON
// -----------------------------
function buildFlowJSON(state: ChatState) {
  return {
    business: state.businessType,
    flow: [
      {
        id: "welcome",
        text: `שלום וברוך הבא ל-${state.businessType}! איך אפשר לעזור?`,
        options: [
          { id: "book", text: "קביעת תור" },
          { id: "prices", text: "מחירים" },
          { id: "info", text: "מידע כללי" }
        ]
      },
      {
        id: "book",
        text: "איזה שירות תרצה להזמין?",
        next: "collect-date"
      },
      {
        id: "collect-date",
        text: "מתי תרצה להגיע?",
        next: "confirm"
      },
      {
        id: "confirm",
        text: "קיבלתי! התור שלך נרשם ✅"
      }
    ]
  };
}


// -----------------------------
// MAIN ENGINE FUNCTION
// -----------------------------
export async function chatEngine(state: ChatState, userMessage: string) {
  // 1. Intent detection
  const intent = detectIntent(userMessage);

  // 2. Switch mode automatically
  if (intent === "advisor") state.mode = "advisor";
  if (intent === "builder") state.mode = "builder";

  // 3. If no mode yet → guess
  if (!state.mode) {
    state.mode = intent === "unknown" ? "advisor" : intent;
  }

  // 4. If builder mode → collect missing info
  if (state.mode === "builder") {
    if (!state.businessType) {
      state.businessType = userMessage;
      state.missingInfo = ["services", "main_goal"];
      return {
        type: "builder_question",
        text: "כדי שאבנה בוט, מה השירותים המרכזיים שלך?",
        state
      };
    }

    // handle missing fields
    if (state.missingInfo.includes("services")) {
      state.collected.services = userMessage;
      state.missingInfo = state.missingInfo.filter(x => x !== "services");

      return {
        type: "builder_question",
        text: "מה המטרה המרכזית של הבוט? (לידים, תורים, מחירים, שירות לקוחות…)",
        state
      };
    }

    if (state.missingInfo.includes("main_goal")) {
      state.collected.main_goal = userMessage;
      state.missingInfo = [];
    }

    // If enough info → generate JSON
    if (hasEnoughInfo(state)) {
      const flow = buildFlowJSON(state);
      return {
        type: "flow_ready",
        text: "הנה התסריט שלך:",
        json: flow,
        state
      };
    }
  }

  // 5. Advisor Mode → ask OpenAI for structured ideas
  if (state.mode === "advisor") {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...state.history,
        { role: "user", content: userMessage }
      ],
      temperature: 0.5
    });

    const answer = response.choices[0].message.content;

    return {
      type: "advisor_reply",
      text: answer,
      state
    };
  }

  // fallback
  return {
    type: "fallback",
    text: "רק כדי להבין – אתה מחפש רעיונות, או רוצה להתחיל לבנות בוט?",
    state
  };
}
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// --- Types ---
export interface FlowStep {
  id: string;
  title?: string;
  content: string;
  buttons?: { label: string; go: string }[];
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowData {
  steps: FlowStep[];
  edges: FlowEdge[];
}

/**
 * המנוע המרכזי: מקבל הודעה ומיקום -> מחזיר תשובה ומיקום חדש
 */
export async function runBotLogic(
  message: string,
  currentStepId: string,
  flow: FlowData
) {
  let nextStepId: string | null = null;
  let replyText = "";
  let buttons: any[] = [];

  // 1. מצא את כל החיבורים היוצאים מהשלב הנוכחי
  const possibleEdges = flow.edges.filter((edge) => edge.source === currentStepId);

  // 2. בדיקה מדויקת: האם ההודעה זהה לכיתוב על Edge (למשל כפתור)
  const exactMatch = possibleEdges.find(
    (e) => e.label && e.label.trim() === message.trim()
  );

  if (exactMatch) {
    nextStepId = exactMatch.target;
  } 
  // 3. אם אין התאמה מדויקת ויש לאן ללכת - נשתמש ב-AI לניתוב (Smart Routing)
  else if (possibleEdges.length > 0) {
    // בדיקה אם יש Edge ברירת מחדל (בלי תווית) - לפעמים רוצים שזה יהיה ה-Fallback
    const defaultEdge = possibleEdges.find((e) => !e.label);

    try {
        const decision = await determineNextStepWithAI(message, currentStepId, possibleEdges);
        
        if (decision && decision !== "NO_MATCH") {
             // AI מצא התאמה
             nextStepId = decision;
        } else if (defaultEdge) {
             // AI לא מצא, אבל יש חיבור אוטומטי (למשל "המשך")
             nextStepId = defaultEdge.target;
        }
    } catch (error) {
        console.error("AI Routing Error:", error);
    }
  }

  // 4. בניית התשובה הסופית
  if (nextStepId) {
    // --- הצלחנו להתקדם לשלב הבא ---
    const nextStep = flow.steps.find((s) => s.id === nextStepId);
    if (nextStep) {
      replyText = nextStep.content;
      buttons = nextStep.buttons || [];
    } else {
      replyText = "שגיאה טכנית: השלב הבא לא נמצא בגרף.";
      nextStepId = currentStepId; // נשארים במקום
    }
  } else {
    // --- נשארים במקום (Fallback / AI Chat) ---
    nextStepId = currentStepId;
    const currentStep = flow.steps.find((s) => s.id === currentStepId);
    buttons = currentStep?.buttons || []; // מציגים שוב את הכפתורים לעזרה

    // מייצרים תשובה מנומסת שלא מקדמת את הגרף
    replyText = await generateFallbackReply(message, currentStepId, flow, buttons);
  }

  return { reply: replyText, buttons, nextStepId };
}

// --- Helper Functions (פנימיות) ---

async function determineNextStepWithAI(message: string, currentStepId: string, edges: FlowEdge[]) {
    const systemPrompt = `
      You are a routing engine for a chatbot.
      User Message: "${message}"
      Current State ID: "${currentStepId}"
      
      Available Transitions (Edges):
      ${edges.map((e) => `- ID: ${e.target}, Trigger: "${e.label || "General Continue"}"`).join("\n")}

      Task:
      Analyze the user message. Does it match the intent of any of the triggers?
      - If yes, return ONLY the Target ID.
      - If NO edge matches clearly, return "NO_MATCH".
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.0, // דטרמיניסטי
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 15,
    });

    return completion.choices[0].message.content?.trim();
}

async function generateFallbackReply(message: string, currentStepId: string, flow: FlowData, buttons: any[]) {
    const systemPrompt = `
        You are a helpful customer service assistant representing the business defined in this flow.
        The user is currently at step: "${currentStepId}".
        User said: "${message}".
        We could not find a defined flow transition for this input.
        
        Please reply politely in Hebrew. 
        - Explain that you didn't understand or ask them to choose an option.
        - Be concise (1-2 sentences).
        - Available Options: ${JSON.stringify(buttons.map(b => b.label))}
    `;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [{ role: "system", content: systemPrompt }],
        max_tokens: 100,
    });

    return completion.choices[0].message.content?.trim() || "לא הבנתי, תוכל לבחור אחת מהאפשרויות?";
}

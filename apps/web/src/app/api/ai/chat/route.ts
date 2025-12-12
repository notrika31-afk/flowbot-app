import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from '@pinecone-database/pinecone';
import { env } from "@/lib/config/env";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ========= Configuration ========= */
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const INDEX_NAME = process.env.PINECONE_INDEX || "flowbot-index";
const MAX_HISTORY = 12;       
const MAX_MESSAGE_LEN = 2000; 

/* ========= Fallback Memory (Server-Side) ========= */
// הערה: בייצור אמיתי עדיף להעביר את ההיסטוריה מה-Client או להשתמש ב-Redis
type Turn = { role: "user" | "assistant" | "system"; content: string };
const mem: Record<string, Turn[]> = {};

function getSessionHistory(sessionId: string): Turn[] {
  return mem[sessionId] ?? [];
}

function addTurnToSession(sessionId: string, turn: Turn) {
  if (!mem[sessionId]) mem[sessionId] = [];
  mem[sessionId].push(turn);
  if (mem[sessionId].length > MAX_HISTORY) {
    mem[sessionId] = mem[sessionId].slice(-MAX_HISTORY);
  }
}

/* ========= Utilities ========= */
function extractJsonBlock(text: string): any | null {
  const m = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function flowLooksReady(flow: any): boolean {
  if (!flow || typeof flow !== "object") return false;
  const steps = Array.isArray(flow.steps) ? flow.steps : [];
  return steps.length >= 2 && !!steps.find((s: any) => s.type === "start");
}

/* ========= Smart RAG Retrieval ========= */
async function getContextFromPinecone(query: string): Promise<string> {
  try {
    // 1. Embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const vector = embeddingResponse.data[0].embedding;

    // 2. Query
    const index = pc.index(INDEX_NAME);
    const queryResponse = await index.query({
      vector: vector,
      topK: 3,
      includeMetadata: true,
    });

    // 3. Build Context String
    const matches = queryResponse.matches || [];
    if (matches.length === 0) return "";
    
    return matches
      .map((m) => m.metadata?.text || "")
      .join("\n---\n");
  } catch (error) {
    console.warn("⚠️ Failed to retrieve context from Pinecone:", error);
    return "";
  }
}

/* ========= System Prompt Generator ========= */
function generateSystemPrompt(context: string, brandSite?: string | null) {
  return `
אתה FlowBot — מומחה לבניית בוטים לווטסאפ וגם נציג תמיכה טכנית של המערכת.
השתמש בהקשר (Context) המצורף כדי לענות על שאלות טכניות על המערכת.
אם המשתמש רוצה לבנות בוט, הנחה אותו בתהליך.

**Context from Knowledge Base:**
${context || "No specific context available."}

**הנחיות לבניית בוט:**
1. הבן את סוג העסק, המטרות והעדפות המסירה.
2. שאל שאלה אחת בכל פעם. היה תמציתי.
3. כשיש מספיק מידע, צור JSON של Flow בתוך בלוק \`\`\`json\`.
4. דבר עברית טבעית, מקצועית ומזמינה (iOS Style).

**מבנה Flow JSON:**
\`\`\`json
{
  "goal": "...",
  "delivery": { "channel": "whatsapp" },
  "steps": [
    { "id": "start", "type": "start", "title": "...", "content": "...", "next": "menu" },
    { "id": "menu", "type": "buttons", "title": "...", "buttons": [{ "label": "...", "go": "..." }] }
  ]
}
\`\`\`

${brandSite ? `אתר המותג: ${brandSite}` : ""}
`.trim();
}

/* ========= Main Route Handler ========= */
export async function POST(req: Request) {
  try {
    // 1. Security & Rate Limiting
    const ip = getClientIp(req);
    const limitResult = rateLimit({
      key: `ai-chat:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    if (!limitResult.ok) {
      return NextResponse.json(
        { error: "too_many_requests", message: "נא להמתין מספר שניות..." },
        { status: 429 }
      );
    }

    // 2. Parse Request
    const body = await req.json();
    const { message, sessionId = "default", history: clientHistory } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 3. Context Retrieval (RAG)
    const userMessage = message.trim().slice(0, MAX_MESSAGE_LEN);
    const contextData = await getContextFromPinecone(userMessage);

    // 4. Build Conversation History
    // מעדיף היסטוריה מה-Client, אחרת משתמש בזיכרון השרת
    let conversation: Turn[] = [];
    
    if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      conversation = clientHistory.map((t: any) => ({ 
        role: t.role, 
        content: t.content 
      }));
    } else {
      conversation = getSessionHistory(sessionId);
    }

    // הוספת ההודעה החדשה
    conversation.push({ role: "user", content: userMessage });
    addTurnToSession(sessionId, { role: "user", content: userMessage });

    // 5. OpenAI Generation
    const systemPrompt = generateSystemPrompt(contextData, process.env.NEXT_PUBLIC_BRAND_SITE_URL);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // שדרוג למודל חזק יותר
      messages: [
        { role: "system", content: systemPrompt },
        ...conversation.slice(-MAX_HISTORY) // שליחת רק ההודעות האחרונות
      ],
      temperature: 0.6,
    });

    const reply = completion.choices[0].message.content || "מצטער, נתקלתי בבעיה.";
    
    // שמירת תשובת הבוט בזיכרון
    addTurnToSession(sessionId, { role: "assistant", content: reply });

    // 6. Output Processing
    const flow = extractJsonBlock(reply);
    const isReady = flowLooksReady(flow);

    // זיהוי כוונות (Intents)
    const intents = {
      simulate: /(סימולציה|הדגמה|תצוגה)/i.test(userMessage) || isReady,
      connect: /(חיבור|וואטסאפ|מספר)/i.test(userMessage) || isReady,
      pricing: /(מחיר|תשלום|מנוי)/i.test(userMessage),
    };

    const actions = [];
    if (intents.simulate) actions.push({ type: "simulate", label: "הפעל סימולציה" });
    if (intents.connect) actions.push({ type: "connect", label: "חבר ל-WhatsApp" });
    if (intents.pricing) actions.push({ type: "pricing", label: "צפה בחבילות" });

    return NextResponse.json({
      reply,
      flow,
      actions,
      ready: isReady,
      // מחזיר את ההיסטוריה המעודכנת כדי שהקליינט יוכל לשמור אותה (Stateless best practice)
      history: [...conversation, { role: "assistant", content: reply }]
    });

  } catch (err: any) {
    console.error("❌ Chat API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

// force update 3
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateSystemPrompt } from './prompts'; // השארתי כבקשתך
import { getUserSession } from '@/lib/auth';
import { googleCalendarService } from '@/lib/services/google-calendar';
import { prisma } from '@/lib/prisma'; 

console.log("API Key Status:", process.env.GOOGLE_API_KEY ? "✅ Loaded" : "❌ MISSING");

const openai = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

/* ============================================================
    HELPERS — CLEANING + ATTACHMENTS (לא נגעתי)
============================================================ */
function cleanAndCompressText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800000);
}

function buildKnowledgeHint(attachments: any[]) {
  if (!attachments || !attachments.length) return "";

  return attachments
    .map((att: any) => {
      if (att.type === "scraped_website") {
        try {
          const data = JSON.parse(att.content);
          return `
=== SITE DUMP: ${data.url} ===
TITLE: ${data.title}
--- DATA START ---
${cleanAndCompressText(data.rawContent)}
--- DATA END ---
`;
        } catch {
          return `[Site Error]`;
        }
      }
      return `[Attachment: ${att.mimeType}]`;
    })
    .join("\n\n");
}

/* ============================================================
    SALVAGE JSON — FIX TRUNCATION (לא נגעתי)
============================================================ */
function salvageTruncatedJSON(raw: string): string {
  let json = raw.trim();

  if (json.endsWith("}")) return json;

  const lastStep = json.lastIndexOf("},");
  if (lastStep !== -1) {
    json = json.substring(0, lastStep + 1) + "]}";
    return json;
  }

  return '{ "steps": [] }';
}

function extractJsonFromText(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  const xmlEnd = text.lastIndexOf("</FLOW_JSON>");
  if (xmlEnd !== -1) return text.substring(start, xmlEnd);

  return text.substring(start);
}

/* ============================================================
    PHASE INTELLIGENCE (לא נגעתי)
============================================================ */
function detectNextPhase(userMessage: string, aiMessage: string, phase: string) {
  const lowerUser = userMessage.toLowerCase();
  const lowerAi = aiMessage.toLowerCase();

  // 1. זיהוי JSON
  if (lowerAi.includes("<flow_json>") || extractJsonFromText(aiMessage)) return "simulate";

  // 2. זיהוי בקשה לבנייה מתוך שיחה (Co-Creation)
  if (phase === "intro") {
      const aiAskingToBuild = lowerAi.includes("לבנות את התסריט") || lowerAi.includes("להתחיל בבנייה") || lowerAi.includes("generate the json");
      const userApproves = ["כן", "מאשר", "סגור", "תתחיל", "בנה", "מעולה"].some(w => lowerUser.includes(w));
      
      if (aiAskingToBuild && userApproves) {
          return "build";
      }
  }

  // 3. המשך זרימה רגילה
  if (phase === "build" && (lowerAi.includes("<flow_json>") || extractJsonFromText(aiMessage))) {
      return "simulate";
  }

  if (phase === "simulate") {
    if (lowerAi.includes("להעביר אותך לחיבור") || lowerAi.includes("לחבר את המערכות")) return "connect";
  }

  return phase;
}

/* ============================================================
    TOOLS DEFINITION (יומן + אוטומציה + תשלומים חדש)
============================================================ */
const CALENDAR_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calendar_check_availability",
      description: "Check for busy slots in the calendar for a given date range.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "ISO date string" },
          end_date: { type: "string", description: "ISO date string" }
        },
        required: ["start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calendar_create_event",
      description: "Book a new meeting/event in the calendar.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Event title" },
          start_time: { type: "string", description: "ISO date string" },
          end_time: { type: "string", description: "ISO date string" },
          email: { type: "string", description: "Attendee email (optional)" }
        },
        required: ["summary", "start_time", "end_time"]
      }
    }
  }
];

const AUTOMATION_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "trigger_automation",
    description: "Send collected lead data or event details to external automation (Make.com). Use this when a user confirms an action, a lead is captured, or a deal is closed.",
    parameters: {
      type: "object",
      properties: {
        event_type: { type: "string", description: "Type of event, e.g. 'new_lead', 'appointment_booked', 'inquiry'" },
        payload: { 
            type: "string", 
            description: "JSON string containing all relevant data (name, phone, email, summary, date, etc.)" 
        }
      },
      required: ["event_type", "payload"]
    }
  }
};

// --- כלי התשלום החדש ---
const PAYMENT_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_payment_link",
    description: "Generate a payment link for Stripe or PayPal.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number" },
        currency: { type: "string", description: "ILS, USD, etc." },
        description: { type: "string" }
      },
      required: ["amount"]
    }
  }
};

/* ============================================================
    MAIN API HANDLER
============================================================ */
export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    const userId = session?.id;

    console.log(`[Engine] User Check: ${userId ? "✅ Found " + userId : "❌ GUEST MODE"}`);

    const body = await req.json();
    let { message, history = [], phase = "intro", attachments = [], existingFlow = null, isFreshScan = false } = body;

    const knowledgeSummary = buildKnowledgeHint(attachments);

    // --- 1. שליפת חיבורים מה-DB + לינקים לתשלום + לינק לאתר ---
    let activeIntegrations: string[] = [];
    let tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
    let paymentLinks: { paybox?: string } = {};
    let siteLink: string | null = null; // <--- חדש: לינק לאתר

    if (userId) {
        try {
            // שולפים את החיבורים + Metadata
            const connections = await prisma.integrationConnection.findMany({
                where: { 
                    userId: userId,
                    status: 'CONNECTED'
                },
                select: { provider: true, metadata: true }
            });

            activeIntegrations = connections.map(c => c.provider);
            
            // בדיקת PayBox
            const paybox = connections.find(c => c.provider === 'PAYBOX');
            if (paybox && paybox.metadata) {
                paymentLinks.paybox = (paybox.metadata as any).paymentUrl;
            }

            // --- חדש: שליפת לינק לאתר ---
            const siteConn = connections.find(c => c.provider === 'SITE_LINK');
            if (siteConn && siteConn.metadata) {
                siteLink = (siteConn.metadata as any).url;
                console.log("✅ Site Link Found:", siteLink);
            }

            console.log("✅ Active Integrations:", activeIntegrations);

            // הקצאת כלים
            if (activeIntegrations.includes('GOOGLE_CALENDAR')) {
                tools.push(...CALENDAR_TOOLS);
            }
            if (activeIntegrations.includes('MAKE')) {
                tools.push(AUTOMATION_TOOL);
            }
            if (activeIntegrations.includes('STRIPE') || activeIntegrations.includes('PAYPAL')) {
                tools.push(PAYMENT_TOOL);
            }

        } catch (dbError) {
            console.error("Error fetching integrations:", dbError);
        }
    }

    const systemPrompt = generateSystemPrompt({
      phase,
      businessInfo: "User Context",
      knowledgeSummary,
      existingFlow,
      isFreshScan,
      integrations: activeIntegrations,
      paymentLinks, // העברת לינקים לתשלום
      siteLink // <--- העברת לינק לאתר לפרומפט
    });

    const currentTimeMsg = `
    CURRENT CONTEXT:
    - Current Time: ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}
    - User ID: ${userId ? "Authenticated" : "Guest (No Tools)"}
    `;

    const messagesForAi: any[] = [
      { role: "system", content: systemPrompt + currentTimeMsg }
    ];

    history.forEach((msg: any) => {
      messagesForAi.push({ role: msg.role === "bot" ? "assistant" : "user", content: msg.text });
    });

    const inputBlock: any[] = [{ type: "text", text: message }];
    messagesForAi.push({ role: "user", content: inputBlock });

    console.log(`→ Sending to Gemini (Phase: ${phase})... Tools count: ${tools.length}`);

    // קריאה ראשונה ל-AI
    let response = await openai.chat.completions.create({
      model: "gemini-2.0-flash-exp",
      messages: messagesForAi,
      temperature: 0.2,
      max_tokens: 8000,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: "auto"
    });

    let aiMessage = response.choices[0]?.message;
    let replyText = aiMessage?.content || "";

    // בדיקת Tools
    if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log(`🛠️ [ENGINE] AI wants to use tools: ${aiMessage.tool_calls.length}`);
      
      messagesForAi.push(aiMessage);

      for (const toolCall of aiMessage.tool_calls) {
        // --- התיקון הקריטי כאן: הוספת cast ל-any ---
        const fnName = (toolCall as any).function.name;
        const args = JSON.parse((toolCall as any).function.arguments);
        let toolResult = "";

        console.log(`   👉 Executing Tool: ${fnName}`, args);

        try {
          if (fnName === "calendar_check_availability" && userId) {
            const slots = await googleCalendarService.listBusySlots(userId, args.start_date, args.end_date);
            toolResult = JSON.stringify({ status: "success", busy_slots: slots });
            console.log(`   ✅ Calendar: Found ${slots.length} busy slots`);
          } 
          else if (fnName === "calendar_create_event" && userId) {
            const event = await googleCalendarService.createEvent(userId, {
              summary: args.summary,
              startTime: args.start_time,
              endTime: args.end_time,
              attendeeEmail: args.email
            });
            toolResult = JSON.stringify({ status: "success", event_link: event.link });
            console.log(`   ✅ Calendar: Event Created!`);
          }
          else if (fnName === "trigger_automation" && userId) {
             const connection = await prisma.integrationConnection.findUnique({
                 where: { userId_provider: { userId, provider: 'MAKE' } },
                 select: { metadata: true }
             });
             const webhookUrl = (connection?.metadata as any)?.webhookUrl;
             if (!webhookUrl) throw new Error("No Webhook URL found.");
             
             await fetch(webhookUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ event: args.event_type, data: JSON.parse(args.payload || '{}') })
             });
             toolResult = JSON.stringify({ status: "success", message: "Automation triggered" });
          }
          // --- הכלי החדש לתשלומים ---
          else if (fnName === "generate_payment_link") {
              // כאן תהיה האינטגרציה האמיתית בעתיד. כרגע זה מוק.
              const mockLink = `https://checkout.stripe.com/pay/mock_${Math.random().toString(36).substring(7)}`;
              toolResult = JSON.stringify({ status: "success", payment_link: mockLink });
          }

        } catch (err: any) {
          console.error(`   ❌ Tool Error:`, err);
          toolResult = JSON.stringify({ status: "error", message: err.message });
        }

        messagesForAi.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult
        });
      }

      // קריאה חוזרת ל-AI עם התוצאות
      const secondResponse = await openai.chat.completions.create({
        model: "gemini-2.0-flash-exp",
        messages: messagesForAi,
        temperature: 0.2
      });

      replyText = secondResponse.choices[0]?.message?.content || "";
    }

    // חילוץ JSON וסיום
    let flowJson = null;
    try {
      const raw = extractJsonFromText(replyText);
      if (raw) {
        const repaired = salvageTruncatedJSON(raw);
        flowJson = JSON.parse(repaired);

        replyText = replyText
          .replace(raw, "")
          .replace(/<\/?FLOW_JSON>/g, "")
          .replace(/```json|```/g, "")
          .trim();
      }
    } catch (e) {
      console.error("JSON Parse Error:", e);
    }

    const nextPhase = detectNextPhase(message, replyText, phase);

    return NextResponse.json({
      reply: replyText,
      flow: flowJson,
      phase: nextPhase
    });

  } catch (error) {
    console.error("AI Engine Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
// force update 10 - Diagnostic Edition (Calendar + Sheets + FULL LOGS)
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateSystemPrompt } from './prompts'; 
import { getUserSession } from '@/lib/auth';
import { googleCalendarService } from '@/lib/services/google-calendar';
import { prisma } from '@/lib/prisma'; 

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

console.log("API Key Status:", process.env.GOOGLE_API_KEY ? "✅ Loaded" : "❌ MISSING");

const openai = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

/* ============================================================
    HELPERS — CLEANING + ATTACHMENTS (כל השורות כאן)
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

function detectNextPhase(userMessage: string, aiMessage: string, phase: string) {
  const lowerUser = userMessage.toLowerCase();
  const lowerAi = aiMessage.toLowerCase();

  if (lowerAi.includes("<flow_json>") || extractJsonFromText(aiMessage)) return "simulate";

  if (phase === "intro") {
      const aiAskingToBuild = lowerAi.includes("לבנות את התסריט") || lowerAi.includes("להתחיל בבנייה") || lowerAi.includes("generate the json");
      const userApproves = ["כן", "מאשר", "סגור", "תתחיל", "בנה", "מעולה"].some(w => lowerUser.includes(w));
      if (aiAskingToBuild && userApproves) return "build";
  }

  if (phase === "build" && (lowerAi.includes("<flow_json>") || extractJsonFromText(aiMessage))) {
      return "simulate";
  }

  if (phase === "simulate") {
    if (lowerAi.includes("להעביר אותך לחיבור") || lowerAi.includes("לחבר את המערכות")) return "connect";
  }

  return phase;
}

/* ============================================================
    TOOLS DEFINITION
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

const SHEETS_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "append_sheets_row",
    description: "Append a new row of data to a Google Sheet.",
    parameters: {
      type: "object",
      properties: {
        spreadsheet_id: { type: "string", description: "The ID of the Google Sheet" },
        values: { type: "array", items: { type: "string" }, description: "Array of values to add as a row" }
      },
      required: ["spreadsheet_id", "values"]
    }
  }
};

const AUTOMATION_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "trigger_automation",
    description: "Send collected lead data or event details to external automation (Make.com).",
    parameters: {
      type: "object",
      properties: {
        event_type: { type: "string" },
        payload: { type: "string" }
      },
      required: ["event_type", "payload"]
    }
  }
};

const PAYMENT_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_payment_link",
    description: "Generate a payment link for Stripe or PayPal.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number" },
        currency: { type: "string" },
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
    const body = await req.json();

    // 🚀 SAVE_DRAFT Logic
    if (body.action === "SAVE_DRAFT" && userId) {
        const { flow, businessDescription } = body;
        
        await prisma.bot.upsert({
            where: { id: flow.id || 'new-draft' },
            update: { 
                flowData: flow, 
                name: flow.goal || "My Bot Flow",
                status: "DRAFT" 
            },
            create: {
                ownerId: userId,
                name: flow.goal || "My Bot Flow",
                flowData: flow,
                status: "DRAFT"
            }
        });

        if (businessDescription) {
            await prisma.user.update({
                where: { id: userId },
                data: { businessDescription }
            });
        }
        return NextResponse.json({ success: true });
    }

    // --- הלוגיקה המקורית שלך ---
    let { message, history = [], phase = "intro", attachments = [], existingFlow = null, isFreshScan = false } = body;
    console.log("📨 [AI Engine] New message received:", message);

    const knowledgeSummary = buildKnowledgeHint(attachments);

    let activeIntegrations: string[] = [];
    let tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
    let paymentLinks: { paybox?: string } = {};
    let siteLink: string | null = null;
    let fullKnowledgeBase = "";

    const effectiveUserId = userId || body.userId;
    console.log("👤 [AI Engine] Effective User ID:", effectiveUserId);

    if (effectiveUserId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: effectiveUserId },
                select: { businessDescription: true }
            });
            fullKnowledgeBase = user?.businessDescription || "";

            const connections = await prisma.integrationConnection.findMany({
                where: { userId: effectiveUserId, status: 'CONNECTED' },
                select: { provider: true, metadata: true }
            });

            activeIntegrations = connections.map(c => c.provider as string);
            console.log("🔗 [AI Engine] Active Connections found in DB:", activeIntegrations);
            
            const paybox = connections.find(c => (c.provider as string) === 'PAYBOX');
            if (paybox && paybox.metadata) {
                paymentLinks.paybox = (paybox.metadata as any).paymentUrl;
            }

            const siteConn = connections.find(c => (c.provider as string) === 'SITE_LINK');
            if (siteConn && siteConn.metadata) {
                siteLink = (siteConn.metadata as any).url;
            }

            if (activeIntegrations.includes('GOOGLE_CALENDAR')) {
                tools.push(...CALENDAR_TOOLS);
                console.log("📅 [AI Engine] Calendar tools added to AI.");
            }
            if (activeIntegrations.includes('GOOGLE_SHEETS')) {
                tools.push(SHEETS_TOOL);
                console.log("📊 [AI Engine] Sheets tool added to AI.");
            }
            if (activeIntegrations.includes('MAKE')) tools.push(AUTOMATION_TOOL);
            if (activeIntegrations.includes('STRIPE') || activeIntegrations.includes('PAYPAL')) tools.push(PAYMENT_TOOL);

        } catch (dbError) {
            console.error("❌ [AI Engine] DB Error fetching integrations:", dbError);
        }
    }

    const systemPrompt = generateSystemPrompt({
      phase,
      businessInfo: "User Context",
      knowledgeSummary,
      fullKnowledgeBase,
      existingFlow,
      isFreshScan,
      integrations: activeIntegrations,
      paymentLinks, 
      siteLink 
    });

    const currentTimeMsg = `\nCURRENT CONTEXT:\n- Time: ${new Date().toLocaleString("he-IL")}\n- User: ${effectiveUserId ? "Auth" : "Guest"}\n`;

    const messagesForAi: any[] = [{ role: "system", content: systemPrompt + currentTimeMsg }];
    
    history.forEach((msg: any) => {
      const role = (msg.role === "bot" || msg.role === "assistant") ? "assistant" : "user";
      const text = msg.text || msg.content || "";
      if (text) {
        messagesForAi.push({ role, content: text });
      }
    });

    if (message) {
        if (messagesForAi.length > 0 && messagesForAi[messagesForAi.length - 1].role === "user") {
            messagesForAi[messagesForAi.length - 1].content += `\n${message}`;
        } else {
            messagesForAi.push({ role: "user", content: [{ type: "text", text: message }] });
        }
    }

    console.log("🤖 [AI Engine] Sending to AI with", tools.length, "available tools.");

    let response = await openai.chat.completions.create({
      model: "gemini-2.0-flash-exp",
      messages: messagesForAi,
      temperature: 0.2,
      max_tokens: 8000,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: "auto"
    });

    let aiMessage = response.choices[0]?.message;
    console.log("💎 [AI Engine] Raw AI Response Object:", JSON.stringify(aiMessage, null, 2));

    let replyText = aiMessage?.content || "";

    if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log("🛠️ [AI Engine] AI decided to use tools. Count:", aiMessage.tool_calls.length);
      messagesForAi.push(aiMessage);
      
      for (const toolCall of aiMessage.tool_calls) {
        const fnName = (toolCall as any).function.name;
        const args = JSON.parse((toolCall as any).function.arguments);
        let toolResult = "";

        console.log(`🚀 [AI Engine] Executing tool: ${fnName}`, args);

        try {
          if (fnName === "calendar_check_availability" && effectiveUserId) {
            const slots = await googleCalendarService.listBusySlots(effectiveUserId, args.start_date, args.end_date);
            toolResult = JSON.stringify({ status: "success", busy_slots: slots });
            console.log("✅ [AI Engine] Calendar check success.");
          } 
          else if (fnName === "calendar_create_event" && effectiveUserId) {
            const event = await googleCalendarService.createEvent(effectiveUserId, { 
                summary: args.summary, 
                startTime: args.start_time, 
                endTime: args.endTime || args.end_time || args.start_time, 
                attendeeEmail: args.email 
            });
            toolResult = JSON.stringify({ status: "success", event_link: event.link });
            console.log("✅ [AI Engine] Calendar event created:", event.link);
          }
          else if (fnName === "append_sheets_row" && effectiveUserId) {
             const conn = await prisma.integrationConnection.findUnique({ 
                 where: { userId_provider: { userId: effectiveUserId, provider: 'GOOGLE_SHEETS' } } 
             });
             if (conn?.accessToken) {
                 const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheet_id}/values/A1:append?valueInputOption=USER_ENTERED`, {
                     method: 'POST',
                     headers: { 
                         'Authorization': `Bearer ${conn.accessToken}`,
                         'Content-Type': 'application/json'
                     },
                     body: JSON.stringify({ values: [args.values] })
                 });
                 if (!res.ok) throw new Error("Sheets API Error");
                 toolResult = JSON.stringify({ status: "success" });
                 console.log("✅ [AI Engine] Sheets row added.");
             } else {
                 throw new Error("Missing Sheets token");
             }
          }
          else if (fnName === "trigger_automation" && effectiveUserId) {
             const conn = await prisma.integrationConnection.findUnique({ where: { userId_provider: { userId: effectiveUserId, provider: 'MAKE' } }, select: { metadata: true } });
             const webhookUrl = (conn?.metadata as any)?.webhookUrl;
             if (webhookUrl) await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: args.event_type, data: JSON.parse(args.payload || '{}') }) });
             toolResult = JSON.stringify({ status: "success" });
          }
          else if (fnName === "generate_payment_link") {
              toolResult = JSON.stringify({ status: "success", payment_link: "https://stripe.com/mock" });
          }
        } catch (err: any) { 
            console.error(`❌ [AI Engine] Error in tool ${fnName}:`, err.message);
            toolResult = JSON.stringify({ status: "error", message: err.message }); 
        }

        messagesForAi.push({ role: "tool", tool_call_id: toolCall.id, content: toolResult });
      }

      const secondResponse = await openai.chat.completions.create({
        model: "gemini-2.0-flash-exp",
        messages: messagesForAi,
        temperature: 0.2
      });
      replyText = secondResponse.choices[0]?.message?.content || "";
    }

    let flowJson = null;
    const raw = extractJsonFromText(replyText);
    if (raw) {
        flowJson = JSON.parse(salvageTruncatedJSON(raw));
        replyText = replyText.replace(raw, "").replace(/<\/?FLOW_JSON>/g, "").replace(/```json|```/g, "").trim();
    }

    return NextResponse.json({
      reply: replyText,
      flow: flowJson,
      phase: detectNextPhase(message, replyText, phase)
    });

  } catch (error) {
    console.error("❌ [AI Engine] Global Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
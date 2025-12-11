import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import * as cheerio from 'cheerio';

// --- שים לב: מחקנו את ה-import של pdf-parse מכאן ---

export const runtime = "nodejs";
export const maxDuration = 60;

/* ========= Config & Helpers ========= */
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

async function extractTextFromImage(buffer: Buffer, mimeType: string, openai: OpenAI): Promise<string> {
  console.log(`👁️ [OCR] Starting OCR process...`);
  try {
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [{ role: "user", content: [{ type: "text", text: "Extract text from image. Return only the text." }, { type: "image_url", image_url: { url: dataUrl } }] }],
      max_tokens: 3000,
    });
    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("❌ [OCR] Failed:", error.message);
    return "";
  }
}

async function scrapeUrl(url: string): Promise<string> {
    console.log(`🌐 [Scraping] ${url}`);
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'FlowBot/1.0' } });
        if (!res.ok) return "";
        const html = await res.text();
        const $ = cheerio.load(html);
        $('script, style, noscript, nav, footer, header').remove();
        return $('body').text().replace(/\s+/g, ' ').trim();
    } catch (e) {
        return "";
    }
}

function splitTextIntoChunks(text: string): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + CHUNK_SIZE;
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) endIndex = lastSpace;
    }
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) chunks.push(chunk);
    startIndex = endIndex - CHUNK_OVERLAP;
  }
  return chunks;
}

function cleanText(text: string): string {
  return text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

/* ========= Main Handler ========= */
export async function POST(req: NextRequest) {
  console.log("📥 [Upload API] Started");

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const url = formData.get("url") as string;
    const notes = formData.get("notes") as string;
    const botId = formData.get("botId") as string;

    let contents: { text: string, source: string, type: string }[] = [];
    
    // URL & Notes processing
    if (url?.length > 5) {
        const txt = await scrapeUrl(url);
        if (txt) contents.push({ text: txt, source: url, type: 'url' });
    }
    if (notes) contents.push({ text: notes, source: 'notes', type: 'text' });
    
    // Files Processing
    if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        for (const f of files) {
            if (!(f instanceof File) || f.size === 0 || f.size > 5 * 1024 * 1024) continue;

            const buffer = Buffer.from(await f.arrayBuffer());
            let txt = "";

            try {
                if (f.type === "application/pdf") {
                    console.log("📄 Parsing PDF: " + f.name);
                    
                    // === התיקון הקריטי ===
                    // טוענים את הספרייה רק בתוך הפונקציה, ועוקפים את בדיקות הטיפוסים
                    // @ts-ignore
                    const pdfParse = require("pdf-parse"); 
                    
                    const data = await pdfParse(buffer);
                    txt = data.text;
                } else if (f.type.startsWith("image/")) {
                    txt = await extractTextFromImage(buffer, f.type, openai);
                } else {
                    txt = buffer.toString("utf-8");
                }
            } catch (e) {
                console.error(`Parse error for ${f.name}:`, e);
            }
            
            if (txt && txt.length > 5) {
                const safeName = f.name.replace(/[^a-zA-Z0-9\u0590-\u05FF.-]/g, "_");
                contents.push({ text: txt, source: safeName, type: 'file' });
            }
        }
    }

    if (contents.length === 0) {
        return NextResponse.json({ error: "No content extracted" }, { status: 400 });
    }

    // Pinecone Upload
    let vectorStatus = "skipped";
    if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
            const index = pc.index(process.env.PINECONE_INDEX || "flowbot-index");

            const vectors = [];
            for (const item of contents) {
                const chunks = splitTextIntoChunks(cleanText(item.text));
                for (let i = 0; i < chunks.length; i++) {
                    const embedding = await openai.embeddings.create({
                        model: "text-embedding-3-small",
                        input: chunks[i],
                    });
                    
                    const asciiSource = item.source.replace(/[^\x00-\x7F]/g, "F");
                    const vectorId = `${botId || 'draft'}_${asciiSource}_${Date.now()}_${i}`;

                    vectors.push({
                        id: vectorId,
                        values: embedding.data[0].embedding,
                        metadata: {
                            text: chunks[i],
                            source: item.source,
                            botId: botId || "unknown"
                        },
                    });
                }
            }
            
            const BATCH = 50;
            for (let i = 0; i < vectors.length; i += BATCH) {
                await index.upsert(vectors.slice(i, i + BATCH));
            }
            vectorStatus = "success";
            console.log(`✅ Uploaded ${vectors.length} vectors to Pinecone`);

        } catch (pineconeError: any) {
            console.error("⚠️ Pinecone Error:", pineconeError.message);
            vectorStatus = "failed_auth";
        }
    }

    return NextResponse.json({ 
        success: true, 
        chunksCount: contents.length,
        vectorStatus: vectorStatus,
        message: vectorStatus === "success" ? "המידע נשמר בהצלחה" : "המידע נקלט (אך לא נשמר בזיכרון לטווח ארוך)"
    });

  } catch (error: any) {
    console.error("Critical Upload Error:", error);
    return NextResponse.json({ error: "Server Error", details: error.message }, { status: 500 });
  }
}
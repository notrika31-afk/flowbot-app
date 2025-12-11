import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

// חובה ב-Next.js כשמשתמשים בספריות כמו pdf-parse
export const runtime = "nodejs";

/* ========= Config ========= */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const INDEX_NAME = process.env.PINECONE_INDEX || "flowbot-index";

// הגדרות לחלוקת הטקסט
const CHUNK_SIZE = 1000; // כמות תווים בכל חתיכה
const CHUNK_OVERLAP = 200; // חפיפה כדי לא לאבד הקשר בין חתיכות

/* ========= Helpers ========= */

// פונקציה לחלוקת טקסט לחתיכות חכמות
function splitTextIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + CHUNK_SIZE;
    
    // ניסיון לחתוך בסוף משפט או רווח כדי לא לחתוך מילה באמצע
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) {
        endIndex = lastSpace;
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex = endIndex - CHUNK_OVERLAP; // זזים אחורה קצת בשביל החפיפה
    if (startIndex < 0) startIndex = 0; // הגנה
  }

  return chunks;
}

// פונקציה לניקוי טקסט (הסרת רווחים כפולים ושורות ריקות)
function cleanText(text: string): string {
  return text
    .replace(/\n+/g, " ") // החלפת ירידת שורה ברווח
    .replace(/\s+/g, " ") // צמצום רווחים כפולים
    .trim();
}

/* ========= Main Handler ========= */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`📂 Processing file: ${file.name} (${file.type})`);

    // 1. חילוץ טקסט מהקובץ
    let rawText = "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === "application/pdf") {
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text;
    } else if (
      file.type === "text/plain" || 
      file.type === "text/markdown" || 
      file.name.endsWith(".txt") || 
      file.name.endsWith(".md")
    ) {
      rawText = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF, TXT, MD allowed." },
        { status: 400 }
      );
    }

    // ניקוי וטיוב הטקסט
    const cleanedText = cleanText(rawText);
    
    if (cleanedText.length < 50) {
        return NextResponse.json({ error: "File content is too short or empty" }, { status: 400 });
    }

    // 2. חלוקה ל-Chunks
    const chunks = splitTextIntoChunks(cleanedText);
    console.log(`✂️ Split into ${chunks.length} chunks.`);

    // 3. יצירת Embeddings ושמירה ב-Pinecone
    const index = pc.index(INDEX_NAME);
    const vectors = [];

    // מעבדים ב-Batches כדי לא להעמיס
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;
      
      // מזהה ייחודי לכל פסקה
      const vectorId = `${file.name.replace(/[^a-zA-Z0-9]/g, "_")}_chunk_${i}`;

      vectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          text: chunk,
          filename: file.name,
          source: "user_upload",
          uploadedAt: new Date().toISOString()
        },
      });
    }

    // שמירה ב-Pinecone (ניתן לפצל ל-Batch של 100 אם הקבצים ממש ענקיים)
    if (vectors.length > 0) {
        await index.upsert(vectors);
    }

    return NextResponse.json({
      success: true,
      message: "File processed and indexed successfully",
      chunks: vectors.length,
      filename: file.name
    });

  } catch (error: any) {
    console.error("❌ Upload Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

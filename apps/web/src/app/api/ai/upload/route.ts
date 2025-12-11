import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // וודא שהנתיב ל-prisma נכון

// התיקון הקריטי: הגדרת סביבת הריצה ל-Node.js
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const botId = formData.get("botId") as string;

    if (!file || !botId) {
      return NextResponse.json({ error: "Missing file or botId" }, { status: 400 });
    }

    // המרת הקובץ ל-Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let textContent = "";

    // טיפול ב-PDF עם מעקף לשגיאת ה-Import
    if (file.type === "application/pdf") {
      try {
        // שימוש ב-require במקום import כדי למנוע שגיאות בנייה
        // (זה יפעל רק עם runtime = "nodejs")
        const pdfParse = require("pdf-parse"); 
        const data = await pdfParse(buffer);
        textContent = data.text;
      } catch (err) {
        console.error("PDF Parse Error:", err);
        return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
      }
    } else {
      // טיפול בקבצי טקסט פשוטים
      textContent = buffer.toString("utf-8");
    }

    // שמירה בדאטה-בייס (KnowledgeBase)
    await prisma.knowledgeItem.create({
      data: {
        botId,
        type: "TEXT",
        content: textContent,
        title: file.name,
        status: "ACTIVE" // או "INDEXED" תלוי בסכמה שלך
      }
    });

    return NextResponse.json({ success: true, fileName: file.name });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
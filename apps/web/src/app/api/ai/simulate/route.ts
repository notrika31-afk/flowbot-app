// /src/app/api/ai/simulate/route.ts
// זהו קובץ API Routes עבור App Router ב-Next.js 13/14

import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { message, flowId, currentStep } = await request.json();

    // --- לוגיקה זמנית: מדמה תגובה של מנוע AI ---
    console.log(`[SIMULATE] Received message: "${message}" for Flow: ${flowId} at Step: ${currentStep}`);

    const botReply = `קיבלתי את ההודעה: '${message}'. 
    זוהי תגובה מדמה מהשרת, הבוט מחשב כרגע את שלב ${currentStep + 1}.`;

    // החזרת תשובה תקינה
    return NextResponse.json({ 
      reply: botReply, 
      nextStep: currentStep + 1, // קידום השלב
      success: true 
    }, { status: 200 });

  } catch (error) {
    console.error("Simulation API Error:", error);
    return NextResponse.json({ error: "שגיאת שרת פנימית בסימולציה." }, { status: 500 });
  }
}

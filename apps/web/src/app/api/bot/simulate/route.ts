import { NextResponse } from "next/server";
import { runBotLogic } from "@/lib/bot-core"; // ודא שהנתיב נכון למיקום הקובץ שיצרת

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { 
      message, 
      flow, 
      currentStepId = "start" 
    } = await req.json();

    if (!message || !flow) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    // קריאה למוח המרכזי (אותה פונקציה שתשמש את הוואטסאפ האמיתי)
    const result = await runBotLogic(message, currentStepId, flow);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Simulation API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

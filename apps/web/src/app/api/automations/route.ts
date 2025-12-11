import { NextResponse } from "next/server";
// הייבוא מהקובץ שלך
import { getAuthUserFromToken } from "@/lib/auth"; 

/* Mock Database */
let dbAutomations = [
  {
    id: "1",
    name: "ברכת ברוכים הבאים",
    trigger: "הודעה ראשונה",
    triggerIcon: "👋",
    stats: { runs: 1240, successRate: "99%" },
    status: "active",
    lastEdited: "לפני שעתיים",
  },
  {
    id: "2",
    name: "סינון לידים (AI Engine)",
    trigger: "זיהוי כוונת רכישה",
    triggerIcon: "🧠",
    stats: { runs: 85, successRate: "82%" },
    status: "active",
    lastEdited: "אתמול",
  },
];

export async function GET() {
  // תיקון: הוספנו await כי הפונקציה מחזירה Promise
  const user = await getAuthUserFromToken();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // סימולציה של דיליי
  await new Promise((resolve) => setTimeout(resolve, 500)); 
  
  return NextResponse.json(dbAutomations);
}

export async function PATCH(request: Request) {
  try {
    // תיקון: הוספנו await גם כאן
    const user = await getAuthUserFromToken();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await request.json();

    // 2. לוגיקה עסקית
    const index = dbAutomations.findIndex((a) => a.id === id);
    if (index !== -1) {
      dbAutomations[index].status = status;
      dbAutomations[index].lastEdited = "עכשיו";
      
      // עכשיו זה יעבוד כי user הוא אובייקט ולא Promise
      console.log(`[AUDIT] User ${user.id} (${user.role}) updated automation ${id}`);
      
      return NextResponse.json({ success: true, data: dbAutomations[index] });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });

  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
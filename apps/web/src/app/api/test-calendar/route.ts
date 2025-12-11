import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { googleCalendarService } from "@/lib/services/google-calendar";

// מבטיח שהקובץ לא יישמר ב-Cache
export const dynamic = "force-dynamic";

// חייב להיקרא בדיוק GET (באותיות גדולות)
export async function GET(req: NextRequest) {
  try {
    console.log("[Test API] Starting check...");

    // 1. בדיקת משתמש מחובר
    const user = await getUserSession();
    
    // בדיקה אם המשתמש לא נמצא
    if (!user || !user.id) {
      console.error("[Test API] No user session found");
      return NextResponse.json({ error: "Unauthorized - Please log in first" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action"); // 'list' (default) or 'create'

    // הגדרת זמנים (מעכשיו עד מחר)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // --- אפשרות 1: יצירת אירוע (אם ביקשת ?action=create) ---
    if (action === "create") {
      console.log("[Test API] Attempting to create event...");
      
      const startTime = new Date(now);
      startTime.setHours(startTime.getHours() + 2); // עוד שעתיים
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1); // למשך שעה

      const result = await googleCalendarService.createEvent(user.id, {
        summary: "📅 FlowBot Test Meeting",
        description: "זוהי פגישת בדיקה שנוצרה אוטומטית.",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      return NextResponse.json({ 
        success: true, 
        message: "✅ Event created successfully!", 
        eventLink: result.link 
      });
    }

    // --- אפשרות 2: קריאת יומן (ברירת מחדל) ---
    console.log("[Test API] Reading calendar slots...");
    const busySlots = await googleCalendarService.listBusySlots(
      user.id,
      now.toISOString(),
      tomorrow.toISOString()
    );

    return NextResponse.json({
      success: true,
      message: "✅ Connection is working properly (Read Access)",
      scannedRange: {
        from: now.toLocaleString("he-IL"),
        to: tomorrow.toLocaleString("he-IL")
      },
      busySlotsCount: busySlots.length,
      busySlots
    });

  } catch (error: any) {
    console.error("[Test API] Failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const store = cookies();

    // מחיקת ה-token (חייב להיות אותו שם כמו ב-auth.ts)
    store.delete("token"); 

    // ליתר ביטחון דורסים אותו ידנית
    store.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Lax עדיף ל-Auth בדרך כלל כדי למנוע בעיות הפניות
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ message: "התנתקת בהצלחה" }, { status: 200 });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    return NextResponse.json(
      { error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}

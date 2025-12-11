// apps/web/src/lib/server-user.ts
import { NextRequest } from "next/server";

export function resolveUserId(req: NextRequest): string {
  // TODO: כאן נחבר את ה-Auth האמיתי (למשל NextAuth / Clerk)
  // כרגע מחזירים ID של משתמש קיים מהדאטה-בייס שלך לצורך פיתוח
  
  // ⚠️ העתק לכאן ID אמיתי מטבלת User ב-DB שלך
  return "cm4..."; 
}

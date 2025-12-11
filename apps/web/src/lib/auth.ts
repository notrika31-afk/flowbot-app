import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// --- Types ---

type JwtRole = "USER" | "ADMIN";

export type JwtPayload = {
  userId: string;
  email?: string;
  role?: JwtRole;
  iat?: number;
  exp?: number;
};

// --- Config ---

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "30d"; // שמירת סשן ל-30 יום

function requireSecret() {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment variables");
  }
  return JWT_SECRET;
}

// --- Token Operations ---

// 1. יצירת טוקן (Sign)
export function signToken(payload: Omit<JwtPayload, "iat" | "exp">) {
  const secret = requireSecret();
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
}

// 2. אימות טוקן (Verify)
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = requireSecret();
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    // טוקן לא תקין או פג תוקף - מחזירים null
    return null;
  }
}

// --- Session Management ---

// 3. שליפת סשן מהיר (Server Side)
// פונקציה זו מיועדת לשימוש ב-Layout וב-Server Components
export async function getUserSession() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    // אופטימיזציה: אם אין טוקן, צא מיד
    if (!token) return null;

    // אימות
    const payload = verifyToken(token);
    
    // אם האימות נכשל או שאין ID
    if (!payload || !payload.userId) return null;

    // החזרת אובייקט משתמש נקי
    return {
      id: payload.userId,
      email: payload.email || "", // מחרוזת ריקה אם אין, למניעת שגיאות UI
      role: (payload.role as JwtRole) || "USER",
    };
  } catch (error) {
    // בכל מקרה של שגיאה בלתי צפויה - החזר שאין משתמש
    console.error("Session Error:", error);
    return null;
  }
}

// 4. תמיכה לאחור (Alias)
// אם השתמשת בפונקציה הזו במקומות אחרים בקוד, היא כעת פשוט קוראת ל-getUserSession
export async function getAuthUserFromToken() {
  return await getUserSession();
}

// src/lib/google.ts
import { google } from "googleapis";

// --- הגדרת הסקופים הדינמיים (הכיסוי המלא) ---
const GOOGLE_SCOPES = {
  // סקופים נדרשים ליומן
  calendar: [
    "https://www.googleapis.com/auth/calendar", 
    "https://www.googleapis.com/auth/calendar.events", 
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  // סקופים נדרשים לגיליונות אלקטרוניים
  sheets: [
    "https://www.googleapis.com/auth/spreadsheets", // הרשאת קריאה/כתיבה לגיליונות
    "https://www.googleapis.com/auth/drive.file",   // הרשאה ליצירת קבצים (חובה)
    "https://www.googleapis.com/auth/userinfo.email",
  ],
};
// --------------------------------

export const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirect: process.env.GOOGLE_REDIRECT_URI, 
};

/**
 * יצירת אובייקט OAuth2 Client
 * אנו משתמשים ב-googleConfig.redirect כערך ברירת מחדל, אבל הוא נדרס ב-login/route.ts
 */
export const createOAuthClient = () => {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    // הערה: ה-redirect URI הזה הוא רק ערך בסיסי, הוא נדרס ב-route.ts
    googleConfig.redirect 
  );
};

/**
 * יצירת לינק לאישור גישה
 * בוחר את הסקופים לפי סוג הספק שנבחר (Calendar או Sheets).
 */
export const getAuthUrl = (oAuth2Client: any, type: 'calendar' | 'sheets') => { 
  const scopes = GOOGLE_SCOPES[type]; // <-- בוחר סקופים דינמית לפי הספק

  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes, // <-- משתמש בסקופים שנבחרו
  });
};
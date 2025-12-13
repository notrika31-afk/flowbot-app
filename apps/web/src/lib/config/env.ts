// apps/web/src/lib/config/env.ts

// -------------------------------
// חובה
// -------------------------------
const REQUIRED = [
  "GOOGLE_API_KEY",
  "DATABASE_URL",
  "NEXT_PUBLIC_BASE_URL",
];

// -------------------------------
// אופציונלי
// -------------------------------
const OPTIONAL = [
  "STRIPE_SECRET_KEY",
  "STRIPE_CLIENT_ID",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "WHATSAPP_API_TOKEN",
  "WHATSAPP_WEBHOOK_SECRET",
  "WHATSAPP_PHONE_NUMBER_ID", // 👈 חדש
];

// -------------------------------
// בדיקת משתני סביבה (Runtime Only, Not Build Time)
// -------------------------------
// ⚠️ IMPORTANT: Do NOT validate env vars at module load time (during build).
// This check should only run at RUNTIME in API routes.
// For build-time validation, use validateEnvAtRuntime() in API handlers instead.

function validateEnvAtRuntime() {
  // Only check and throw errors at runtime, not during Next.js build
  if (typeof window === "undefined") {
    // Server-side only
    const missing = REQUIRED.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.warn("⚠️ Missing required env variables:", missing);

      // DEV → רק אזהרה
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "⚠️ Development mode: ממשיכים למרות שחסר משתנה. ודא ש-.env.local מוגדר."
        );
        return;
      }

      // PROD → מפיל את השרת (only at runtime, not build)
      throw new Error(
        `❌ Missing required env variables: ${missing.join(", ")}`
      );
    }
  }
}

// Don't call checkEnv() at module load — defer to runtime!

// -------------------------------
// יצוא – שימוש בכל המערכת
// -------------------------------
export const env = {
  // חובה
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "",

  // אופציונלי
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || null,
  STRIPE_CLIENT_ID: process.env.STRIPE_CLIENT_ID || null,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || null,

  WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN || null,
  WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET || null,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || null, // 👈 חדש
};

// Export the runtime validation function for use in API routes
export { validateEnvAtRuntime };
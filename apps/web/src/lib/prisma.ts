// apps/web/src/lib/prisma.ts

// 1. שימוש ב-require (שיטת Node.js) במקום import כדי לעקוף את בעיית ה-Typescript.
// @ts-ignore - נאפשר ל-require לעבוד למרות שזה לא דרך TS מודרנית
const PrismaClient = require("@prisma/client").PrismaClient;

// 2. אנחנו משתמשים ב-as any כדי להימנע מבעיית הייבוא של הטיפוסים
const globalForPrisma = global as any;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // במצב פיתוח, נחמד לראות את השאילתות רצות
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// שמירה על מופע אחד גלובלי (Singleton)
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
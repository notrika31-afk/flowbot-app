// apps/web/src/lib/prisma.ts
// אנחנו משאירים את הייבוא כדי שיהיה ניתן להשתמש ב-PrismaClient בתוך הקובץ
import { PrismaClient } from "@prisma/client";

// אנחנו משתמשים ב-as any כדי לאלץ את הטיפוס הגלובלי להתעלם מבדיקת הטיפוסים הקפדנית
const globalForPrisma = global as any as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // במצב פיתוח, נחמד לראות את השאילתות רצות
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// אנחנו משתמשים ב-as any כדי לאלץ את ה-TS לקבל את ההגדרה מחדש בזמן פיתוח
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma as any;
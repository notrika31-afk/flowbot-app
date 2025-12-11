// apps/web/src/lib/prisma.ts

// 1. ייבוא הטיפוסים תחת 'type' כדי לא להפריע לבדיקת ה-Build
import type { PrismaClient } from "@prisma/client";

// 2. ייבוא הערך לשימוש בזמן ריצה תחת שם אחר
import { PrismaClient as PrismaClientValue } from "@prisma/client";

// אנחנו משתמשים ב-as any כדי לאלץ את הטיפוס הגלובלי להתעלם מבדיקת הטיפוסים הקפדנית
const globalForPrisma = global as any as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClientValue({ // שימוש ב-PrismaClientValue
    // במצב פיתוח, נחמד לראות את השאילתות רצות
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// אנחנו משתמשים ב-as any כדי לאלץ את ה-TS לקבל את ההגדרה מחדש בזמן פיתוח
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma as any;
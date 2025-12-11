// src/lib/db.ts
// אנחנו משתמשים רק ב-PrismaClient כערך, ואת הטיפוסים מעבירים באמצעות assertion.
import { PrismaClient } from "@prisma/client";

// הגדרה של טיפוס גלובלי. אנחנו מסתמכים על כך שה-PrismaClient קיים.
const globalForPrisma = global as unknown as { 
    prisma: PrismaClient | undefined 
};

// יצירת מופע גלובלי (Singleton) של PrismaClient
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"], // אופציונלי: מראה את השאילתות בטרמינל
  });

// שמירה על מופע אחד גלובלי (למנוע יצירת חיבורים מיותרים בזמן פיתוח)
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
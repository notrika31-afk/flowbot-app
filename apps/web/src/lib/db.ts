// src/lib/db.ts
import type { PrismaClient } from "@prisma/client"; // התיקון: הוספת type לייבוא
import { PrismaClient as PrismaClientValue } from "@prisma/client"; // ייבוא הערך תחת שם אחר

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClientValue({ // שימוש בשם של הערך שיובא
    log: ["query"], // אופציונלי: מראה את השאילתות בטרמינל
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma as any;
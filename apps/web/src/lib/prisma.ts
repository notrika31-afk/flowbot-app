// src/lib/prisma.ts

// @ts-ignore - התעלמות משגיאת הטיפוסים החוזרת על PrismaClient
import { PrismaClient } from '@prisma/client'; 

// מאפשרים ל-Typescript לעבוד עם המשתנה הגלובלי, תוך שימוש ב-any
const globalForPrisma = globalThis as any as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // בשימוש ב-Node Client, נוודא שהוא משתמש ב-DATABASE_URL מהסביבה
    log: ['query', 'error', 'warn'],
  });

// ב־DEV נשמור מופע גלובלי (Singleton)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
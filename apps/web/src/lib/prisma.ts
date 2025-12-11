// src/lib/prisma.ts

// חוזרים לגרסת Prisma Client הסטנדרטית (Node)
import { PrismaClient } from '@prisma/client'; 

// מאפשרים ל-Typescript לעבוד עם המשתנה הגלובלי
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // בשימוש ב-Node Client, אין צורך ב-datasourceUrl מיוחד
    // נוודא שהוא משתמש ב-DATABASE_URL מהסביבה
    log: ['query', 'error', 'warn'],
  });

// ב־DEV נשמור מופע גלובלי (Singleton)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
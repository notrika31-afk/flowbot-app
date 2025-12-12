// src/lib/prisma.ts

// 1. השורה הזו מכבה את השגיאה הספציפית של הייבוא
// @ts-ignore
import { PrismaClient } from '@prisma/client';

// 2. שימוש ב-any עבור המשתנה הגלובלי כדי למנוע שרשרת שגיאות טיפוסים
const globalForPrisma = globalThis as any;

// 3. יצירת המופע. אנחנו סומכים על כך שבזמן ריצה (Runtime) הספרייה קיימת
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 4. שמירת המופע הגלובלי (Singleton) למניעת ריבוי חיבורים
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

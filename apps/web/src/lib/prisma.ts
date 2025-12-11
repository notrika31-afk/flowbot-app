import { PrismaClient } from '@prisma/client/edge'; 

// שמירה על התמיכה בנוד לשימוש מקומי (Hot Reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL, 
  });

// ב־DEV נשמור מופע גלובלי כדי למנוע יצירת חיבורים אינסופיים
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
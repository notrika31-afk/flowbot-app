// apps/web/src/lib/prisma.ts

// אנחנו משאירים את הייבוא הנדרש כדי שנוכל ליצור מופע חדש
import { PrismaClient } from "@prisma/client";

// אנחנו משתמשים ב-as any כדי להימנע מבעיית הייבוא של הטיפוסים
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
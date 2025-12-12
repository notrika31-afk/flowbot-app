import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/lib/auth';

// 强制动态路由 - 禁止任何静态生成或缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0; // 无缓存
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // 1. זיהוי המשתמש - עם הגנה מפני שגיאות בניית סטטית
    let user = null;
    try {
      user = await getUserSession();
    } catch (authError) {
      // אם יש שגיאה בשליפת הסשן (למשל בזמן בנייה), נחזור null
      // זה לא יעצור את הבנייה
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 2. שליפת נתונים במקביל (עם התיקון ל-ownerId)
    const [
      activeBotsCount,
      automationsCount,
      newLeadsCount,
      totalMessagesCount
    ] = await Promise.all([
      
      // א. ספירת בוטים (תוקן ל-ownerId)
      prisma.bot.count({
        where: {
          ownerId: user.id, // <--- התיקון כאן
          isActive: true, 
        },
      }).catch(() => 0),

      // ב. ספירת Flows (תוקן ל-bot: { ownerId: ... })
      prisma.flow.count({
        where: {
          bot: {
            ownerId: user.id, // <--- התיקון כאן
          },
          status: 'PUBLISHED',
        },
      }).catch(() => 0),

      // ג. ספירת לידים (תוקן ל-ownerId)
      prisma.contact.count({
        where: {
          bot: {
            ownerId: user.id, // <--- התיקון כאן
          },
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }).catch(() => 0),

      // ד. ספירת הודעות (תוקן ל-ownerId)
      prisma.messageLog.count({
        where: {
          bot: {
            ownerId: user.id, // <--- התיקון כאן
          },
        },
      }).catch(() => 0),
    ]);

    return NextResponse.json({
      activeBots: activeBotsCount,
      activeAutomations: automationsCount,
      newLeads: newLeadsCount,
      totalMessages: totalMessagesCount,
    });

  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
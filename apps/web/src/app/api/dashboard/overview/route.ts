import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 1. זיהוי המשתמש
    let user: any = null;
    try {
      user = await getUserSession();
    } catch (authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 2. שליפת נתונים
    const [
      activeBotsCount,
      automationsCount,
      newLeadsCount
      // הורדנו זמנית את totalMessagesCount כי הטבלה לא נמצאה
    ] = await Promise.all([
      
      // א. ספירת בוטים
      prisma.bot.count({
        where: {
          ownerId: user.id,
          isActive: true, 
        },
      }).catch(() => 0),

      // ב. ספירת Flows
      prisma.flow.count({
        where: {
          bot: { ownerId: user.id },
          isPublished: true,
        },
      }).catch(() => 0),

      // ג. ספירת לידים
      prisma.contact.count({
        where: {
          bot: { ownerId: user.id },
          createdAt: { gte: thirtyDaysAgo },
        },
      }).catch(() => 0),
    ]);

    return NextResponse.json({
      activeBots: activeBotsCount,
      activeAutomations: automationsCount,
      newLeads: newLeadsCount,
      totalMessages: 0, // זמני: מחזירים 0 עד שנבין את שם הטבלה הנכון
    });

  } catch (error: any) {
    console.error('Dashboard Overview Fatal Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error: ' + error.message },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = cookies().get('token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const decoded = await verifyToken(token); 

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true, 
        // role: true <--- מחקתי את השורה הזו כי היא עשתה את השגיאה
      }
    });

    return NextResponse.json({ user });

  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. אימות שהמשתמש מחובר
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. קבלת הטוקן וה-ID מהכפתור שבנינו
    const body = await req.json();
    const { accessToken, userID } = body;

    console.log("🔥 קיבלתי בקשה ליצירת בוט עבור:", session.user.email);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // 3. יצירת הבוט + הגדרות הוואטסאפ במכה אחת
    const newBot = await prisma.bot.create({
      data: {
        name: "הבוט החדש שלי 🤖", // שם התחלתי
        ownerId: user.id,
        isActive: true,
        status: "ACTIVE",
        description: "חובר בהצלחה דרך פייסבוק",
        
        // יצירת החיבור לטבלת הוואטסאפ
        wabaConnection: {
          create: {
             userId: user.id,
             wabaId: userID, // מזהה חשבון הוואטסאפ
             phoneNumberId: userID, // זמני - בהמשך נעדכן למספר האמיתי
             accessToken: accessToken,
             verifyToken: "flowbot_verify_token",
             phoneNumber: "", // יתעדכן בהמשך
             isActive: true
          }
        }
      },
    });

    return NextResponse.json({ success: true, botId: newBot.id });

  } catch (error) {
    console.error("❌ שגיאה ביצירת הבוט:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
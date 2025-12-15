import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; 

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. קבלת הקוד מפייסבוק
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      console.error("Facebook Auth Error:", error);
      return NextResponse.redirect(new URL("/builder/whatsapp?error=auth_failed", req.url));
    }

    // 2. זיהוי המשתמש
    const session = await getUserSession();
    if (!session?.id) {
       return NextResponse.redirect(new URL("/login", req.url));
    }

    // 3. החלפת הקוד ב-Token
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    // משתמשים בכתובת הראשית החדשה שלך
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://flowbot-app.vercel.app"}/api/auth/facebook/callback`;

    const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token Exchange Failed:", tokenData.error);
      return NextResponse.redirect(new URL("/builder/whatsapp?error=token_exchange_failed", req.url));
    }

    const accessToken = tokenData.access_token;

    // --- החלק שהחזרנו: שליפה אוטומטית של מספר הטלפון ---
    
    // אנו שואלים את פייסבוק: תביא לי את חשבונות הוואטסאפ (WABA) של היוזר הזה
    // ואת מספרי הטלפון שמחוברים אליהם.
    const detailsUrl = `https://graph.facebook.com/v22.0/me?fields=id,name,accounts{name,phone_numbers{id,display_phone_number}}&access_token=${accessToken}`;
    
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    let fetchedPhoneId = "pending_manual_selection";
    let fetchedWabaId = "pending_manual_selection";

    // לוגיקה חכמה: לוקחים את המספר הראשון שמוצאים
    try {
        if (detailsData.accounts && detailsData.accounts.data && detailsData.accounts.data.length > 0) {
            const firstAccount = detailsData.accounts.data[0];
            fetchedWabaId = firstAccount.id; // מזהה העסק (WABA ID)

            if (firstAccount.phone_numbers && firstAccount.phone_numbers.data && firstAccount.phone_numbers.data.length > 0) {
                fetchedPhoneId = firstAccount.phone_numbers.data[0].id; // מזהה הטלפון (Phone ID)
                console.log("✅ Successfully auto-detected Phone ID:", fetchedPhoneId);
            }
        }
    } catch (e) {
        console.warn("⚠️ Could not auto-fetch phone details, saving token only.");
    }

    // 5. שמירה לדאטה-בייס (טוקן + מספר טלפון)
    const existingConnection = await prisma.whatsAppConnection.findFirst({
        where: { userId: session.id }
    });

    if (existingConnection) {
        await prisma.whatsAppConnection.update({
            where: { id: existingConnection.id },
            data: {
                accessToken: accessToken,
                wabaId: fetchedWabaId,
                phoneNumberId: fetchedPhoneId,
                isActive: true
            }
        });
    } else {
        await prisma.whatsAppConnection.create({
            data: {
                userId: session.id,
                accessToken: accessToken,
                wabaId: fetchedWabaId,
                phoneNumberId: fetchedPhoneId,
                isActive: true
            }
        });
    }

    // 6. סיום והחזרה לאתר
    return NextResponse.redirect(new URL("/builder/whatsapp?success=true", req.url));

  } catch (err: any) {
    console.error("Callback Critical Error:", err);
    return NextResponse.redirect(new URL("/builder/whatsapp?error=server_error", req.url));
  }
}
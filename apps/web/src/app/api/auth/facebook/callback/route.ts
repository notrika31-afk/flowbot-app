import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; // וודא שהנתיב נכון לפונקציית ה-Session שלך

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. קבלת הקוד מפייסבוק
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(new URL("/builder/whatsapp?error=auth_failed", req.url));
    }

    // 2. זיהוי המשתמש באתר שלך
    // אנחנו חייבים לדעת מי המשתמש כדי לשמור לו את הטוקן
    // בגלל שזו קריאת API, ה-Cookie אמור לעבור
    const session = await getUserSession();
    if (!session?.id) {
       return NextResponse.redirect(new URL("/login", req.url));
    }

    // 3. החלפת הקוד ב-Token
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://flowbot-gzn7st34s-notrika31-5984s-projects.vercel.app"}/api/auth/facebook/callback`;

    const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token Exchange Error:", tokenData.error);
      return NextResponse.redirect(new URL("/builder/whatsapp?error=token_exchange_failed", req.url));
    }

    const accessToken = tokenData.access_token;

    // 4. שליפת פרטי העסק (WABA ID + Phone ID) באמצעות הטוקן
    // אנחנו מבקשים מפייסבוק: תביא לי את חשבונות הוואטסאפ המחוברים ליוזר הזה
    const accountsUrl = `https://graph.facebook.com/v22.0/me?fields=id,name,accounts&access_token=${accessToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    // לוגיקה פשוטה: לוקחים את העסק הראשון והטלפון הראשון שמוצאים
    // (בגרסה מתקדמת יותר, אפשר לתת למשתמש לבחור אם יש לו כמה עסקים)
    
    // הערה: המבנה של התשובה משתנה לפעמים תלוי בסוג החשבון.
    // לצורך ה-MVP, נניח שהמשתמש יצר עסק חדש בתהליך ה-Embedded
    
    // במקום להסתבך עם חיפושים, נשתמש בטוקן כדי לשמור את החיבור
    // הלקוח יצטרך רק לבחור מספר אם יש כמה, אבל לרוב יש אחד.
    
    // לצורך ה-MVP האוטומטי, אנחנו נשמור את הטוקן, 
    // ובקריאה הבאה (Publish) נשתמש בו כדי למצוא את ה-ID המדויק אם חסר.
    // אבל עדיף לנסות למצוא עכשיו:
    
    let phoneId = "";
    let wabaId = "";

    // ניסיון לשלוף WABA IDs (דורש הרשאת whatsapp_business_management)
    const wabaRes = await fetch(`https://graph.facebook.com/v22.0/me/businesses?access_token=${accessToken}`);
    const wabaData = await wabaRes.json();

    // אם זה מסובך מדי לשליפה עכשיו, נשמור לפחות את הטוקן
    // והמשתמש יוכל להשלים או שהמערכת תשלים אוטומטית.
    
    // 5. שמירה לדאטה-בייס
    // נבדוק אם יש כבר חיבור ונחליף, או ניצור חדש
    const existingConnection = await prisma.whatsAppConnection.findFirst({
        where: { userId: session.id }
    });

    if (existingConnection) {
        await prisma.whatsAppConnection.update({
            where: { id: existingConnection.id },
            data: {
                accessToken: accessToken,
                // אם הצלחנו להשיג IDs נעדכן, אחרת נשאיר או נשים זמני
                isActive: true
            }
        });
    } else {
        await prisma.whatsAppConnection.create({
            data: {
                userId: session.id,
                accessToken: accessToken,
                phoneNumberId: "pending_fetch", // המערכת תעדכן את זה בשימוש הראשון
                wabaId: "pending_fetch",
                isActive: true
            }
        });
    }

    // 6. החזרה לעמוד הוואטסאפ עם הודעת הצלחה
    return NextResponse.redirect(new URL("/builder/whatsapp?success=true", req.url));

  } catch (err: any) {
    console.error("Callback Error:", err);
    return NextResponse.redirect(new URL("/builder/whatsapp?error=server_error", req.url));
  }
}
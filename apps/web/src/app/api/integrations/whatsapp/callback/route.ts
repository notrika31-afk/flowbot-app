import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    
    // 1. אימות משתמש מחובר (מבוסס על ה-auth.ts שלך)
    const session = await getUserSession();
    if (!session || !session.id) {
      console.error("❌ Auth Error: No session found");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // בדיקה אם פייסבוק החזיר קוד
    if (!code) {
      console.error("❌ Facebook Error: No code provided");
      return new NextResponse("No code provided from Facebook", { status: 400 });
    }

    // --- שלב זמני עבור ה-Review של פייסבוק ---
    // אנחנו שומרים מחרוזת זמנית ב-Database כדי לבדוק שהכל מחובר תקין.
    // ברגע שתקבל אישור ממטא, נעדכן כאן את הקריאה ל-API שלהם כדי להוציא טוקן אמיתי.
    const accessToken = "PENDING_REVIEW_ACCESS_TOKEN"; 
    const wabaId = searchParams.get("whatsapp_business_account_id") || "TEMP_WABA_" + Math.random().toString(36).substring(7);

    // 2. שמירת החיבור ב-Database (מניעת שגיאת ה-Unique של Prisma)
    const existingConnection = await prisma.wabaConnection.findFirst({
        where: { userId: session.id }
    });

    if (existingConnection) {
        // עדכון חיבור קיים למשתמש זה
        await prisma.wabaConnection.update({
            where: { id: existingConnection.id },
            data: { 
                accessToken: accessToken, 
                isActive: true,
                wabaId: wabaId,
                phoneNumberId: wabaId // בשלב זה נשתמש ב-ID של החשבון כמזהה טלפון זמני
            }
        });
    } else {
        // יצירת חיבור חדש לגמרי
        await prisma.wabaConnection.create({
            data: {
                userId: session.id,
                wabaId: wabaId,
                phoneNumberId: wabaId,
                accessToken: accessToken,
                verifyToken: "flowbot_verify_token",
                isActive: true
            }
        });
    }

    // 3. החזרת ה-HTML שסוגר את החלון ומעדכן את האתר הראשי
    return new NextResponse(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>החיבור הצליח!</title>
        </head>
        <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background:#f9fafb; margin:0;">
          <div style="text-align:center; padding: 20px;">
            <div style="color:#16a34a; font-size:60px; margin-bottom:10px;">✓</div>
            <h2 style="color:#111827; margin-bottom:10px;">החיבור הושלם בהצלחה!</h2>
            <p style="color:#6b7280;">החלון ייסגר אוטומטית בעוד רגע...</p>
          </div>
          <script>
            // עדכון ה-LocalStorage שהדף הראשי מאזין לו
            localStorage.setItem('fb_auth_result', JSON.stringify({ 
              status: 'SUCCESS',
              timestamp: new Date().getTime() 
            }));

            // שליחת הודעה ישירה לחלון האב (במידה והוא פתוח)
            if (window.opener) {
              window.opener.postMessage({ type: 'FACEBOOK_AUTH_RESULT', status: 'SUCCESS' }, '*');
            }

            // סגירת החלון אחרי השהייה קלה כדי שהמשתמש יראה את ה-V
            setTimeout(() => {
              window.close();
            }, 1200);
          </script>
        </body>
      </html>
    `, { 
      headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    });

  } catch (error) {
    console.error("❌ Callback Error:", error);
    return new NextResponse("Internal Server Error during WhatsApp connection", { status: 500 });
  }
}
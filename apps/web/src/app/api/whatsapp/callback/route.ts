import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; // ייבוא הפונקציה המדויקת מהקובץ שלך

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    
    // 1. אימות משתמש מחובר לפי ה-auth.ts שלך
    const session = await getUserSession();
    
    if (!session || !session.id) {
      return new NextResponse("Unauthorized - Please log in", { status: 401 });
    }

    if (!code) return new NextResponse("No code provided from Facebook", { status: 400 });

    // --- כאן יבוא הקוד שיחליף את ה-code ב-access_token מול פייסבוק בעתיד ---
    // כרגע אנחנו משתמשים בנתונים זמניים כדי לבדוק שהחיבור וה-Database עובדים
    const accessToken = "TEMP_TOKEN_" + Math.random().toString(36).substring(7); 
    const wabaId = "TEMP_WABA_" + Math.random().toString(36).substring(7);

    // 2. שמירת החיבור ב-Database תחת המשתמש המחובר
    await prisma.wabaConnection.upsert({
        where: { wabaId: wabaId },
        update: { accessToken: accessToken, isActive: true },
        create: {
            userId: session.id, // שימוש ב-ID מהסשן שלך
            wabaId: wabaId,
            phoneNumberId: wabaId,
            accessToken: accessToken,
            verifyToken: "flowbot_verify_token",
            isActive: true
        }
    });

    // 3. הקוד שסוגר את ה-Popup ומעדכן את האתר הראשי (Frontend)
    return new NextResponse(`
      <html>
        <head>
          <title>Connecting to WhatsApp...</title>
        </head>
        <body style="background: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <div style="color: #16a34a; font-size: 48px; margin-bottom: 10px;">✓</div>
            <h2 style="margin-bottom: 5px;">החיבור הצליח!</h2>
            <p style="color: #6b7280;">החלון נסגר ומעדכן את הבוט שלך...</p>
          </div>
          
          <script>
            // 1. מעדכן את ה-LocalStorage שהחיבור עבר בהצלחה
            localStorage.setItem('fb_auth_result', JSON.stringify({ 
              status: 'SUCCESS',
              timestamp: new Date().getTime()
            }));
            
            // 2. שולח הודעה לחלון הראשי (למקרה שהוא מאזין)
            if (window.opener) {
              window.opener.postMessage({ type: 'FACEBOOK_AUTH_RESULT', status: 'SUCCESS' }, '*');
            }
            
            // 3. סוגר את החלון אחרי חצי שנייה כדי שהמשתמש יספיק לראות "וי"
            setTimeout(() => {
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    console.error("❌ Callback Error:", error);
    return new NextResponse("Internal Server Error during connection", { status: 500 });
  }
}
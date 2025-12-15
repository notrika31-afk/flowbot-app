import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth"; 

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // פונקציית עזר ליצירת דף ה-HTML שיסגור את החלון
    // כולל תמיכה למובייל (אם החלון לא נסגר לבד)
    const generateCloseScript = (status: string, message: string) => `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>מתחבר...</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 40px 20px; background: #f9fafb; }
                .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
                h1 { color: #10b981; margin-bottom: 10px; }
                p { color: #6b7280; margin-bottom: 20px; }
                .btn { background: #1877F2; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 16px; text-decoration: none; }
            </style>
        </head>
        <body>
          <div class="card">
             ${status === 'SUCCESS' 
                ? '<h1>✅ החיבור הצליח!</h1><p>החלון אמור להיסגר אוטומטית.</p>' 
                : '<h1>❌ שגיאה</h1><p>' + message + '</p>'}
             
             <p style="font-size: 12px; margin-top: 20px;">אם החלון לא נסגר, אתם יכולים לחזור לאפליקציה.</p>
             <button class="btn" onclick="window.close()">סגור חלון</button>
          </div>

          <script>
            // שליחת הודעה לחלון האב (האתר הראשי)
            if (window.opener) {
                window.opener.postMessage({ 
                    type: 'FACEBOOK_AUTH_RESULT', 
                    status: '${status}', 
                    message: '${message}' 
                }, '*');
                
                // ניסיון סגירה אוטומטי
                setTimeout(() => {
                    window.close();
                }, 1000);
            }
          </script>
        </body>
      </html>
    `;

    if (error || !code) {
      return new NextResponse(generateCloseScript('ERROR', 'החיבור בוטל או נכשל.'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    const session = await getUserSession();
    if (!session?.id) {
       return new NextResponse(generateCloseScript('ERROR', 'המשתמש לא מחובר.'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    // --- החלפת טוקן ---
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://flowbot-app.vercel.app"}/api/auth/facebook/callback`;

    const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token Exchange Failed:", tokenData.error);
      return new NextResponse(generateCloseScript('ERROR', 'כשל בהחלפת הטוקן.'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    const accessToken = tokenData.access_token;

    // --- שליפת פרטים ---
    const detailsUrl = `https://graph.facebook.com/v22.0/me?fields=id,name,accounts{name,phone_numbers{id,display_phone_number}}&access_token=${accessToken}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    let fetchedPhoneId = "pending_manual_selection";
    let fetchedWabaId = "pending_manual_selection";

    try {
        if (detailsData.accounts && detailsData.accounts.data && detailsData.accounts.data.length > 0) {
            const firstAccount = detailsData.accounts.data[0];
            fetchedWabaId = firstAccount.id;

            if (firstAccount.phone_numbers && firstAccount.phone_numbers.data && firstAccount.phone_numbers.data.length > 0) {
                fetchedPhoneId = firstAccount.phone_numbers.data[0].id;
            }
        }
    } catch (e) {
        console.warn("Auto-fetch warning:", e);
    }

    // --- שמירה לדאטה-בייס ---
    const existingConnection = await prisma.whatsAppConnection.findFirst({
        where: { userId: session.id }
    });

    const dataToSave = {
        userId: session.id,
        accessToken: accessToken,
        wabaId: fetchedWabaId,
        phoneNumberId: fetchedPhoneId,
        isActive: true
    };

    if (existingConnection) {
        await prisma.whatsAppConnection.update({
            where: { id: existingConnection.id },
            data: dataToSave
        });
    } else {
        await prisma.whatsAppConnection.create({
            data: dataToSave
        });
    }

    // --- סיום מוצלח ---
    return new NextResponse(generateCloseScript('SUCCESS', 'מחובר בהצלחה'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    });

  } catch (err: any) {
    console.error("Callback Critical Error:", err);
    // במקרה קריסה, מחזירים HTML של שגיאה במקום סתם JSON
    return new NextResponse(
        `<html><body><script>window.opener.postMessage({ type: 'FACEBOOK_AUTH_RESULT', status: 'ERROR', message: 'Server Error' }, '*'); window.close();</script><h1>שגיאת שרת</h1></body></html>`, 
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";
// תיקון: ייבוא ה-Enum כדי למנוע קריסה
import { IntegrationProvider } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // --- HTML לסגירת החלון (עיצוב נקי) ---
    // שינוי: הוספתי כאן את הכתיבה ל-localStorage כדי שהאתר הראשי יקלוט את זה מיד
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
                .error { color: #ef4444; }
            </style>
        </head>
        <body>
          <div class="card">
             ${status === 'SUCCESS' 
                ? '<h1>✅ החיבור הצליח!</h1><p>החלון אמור להיסגר אוטומטית.</p>' 
                : '<h1 class="error">❌ שגיאה</h1><p>' + message + '</p>'}
             
             <p style="font-size: 12px; margin-top: 20px;">אם החלון לא נסגר, אתם יכולים לחזור לאפליקציה.</p>
             <button class="btn" onclick="window.close()">סגור חלון</button>
          </div>

          <script>
            // 1. נסיון רגיל (תקשורת ישירה)
            try {
                if (window.opener) {
                    window.opener.postMessage({ 
                        type: 'FACEBOOK_AUTH_RESULT', 
                        status: '${status}', 
                        message: '${message}' 
                    }, '*');
                }
            } catch (e) { console.error(e); }

            // 2. המנגנון החדש: כתיבה לתיבת דואר משותפת (LocalStorage)
            // זה מה שיגרום לאתר שלך להתעדכן גם אם יש חסימות דפדפן
            try {
                localStorage.setItem('fb_auth_result', JSON.stringify({
                    status: '${status}',
                    message: '${message}',
                    timestamp: Date.now()
                }));
            } catch (e) { console.error("LocalStorage write failed", e); }

            // 3. סגירת החלון
            setTimeout(() => {
                window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `;

    if (error || !code) {
      return new NextResponse(generateCloseScript('ERROR', 'החיבור בוטל או נכשל מצד פייסבוק.'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    const session = await getUserSession();
    if (!session?.id) {
       return new NextResponse(generateCloseScript('ERROR', 'משתמש לא מחובר במערכת.'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    // --- תמיכה במשתני סביבה שונים ---
    const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    
    if (!appId || !appSecret) {
        console.error("Missing Facebook Keys");
        return new NextResponse(generateCloseScript('ERROR', 'שגיאת הגדרות שרת (Missing Keys).'), { 
            headers: { 'Content-Type': 'text/html; charset=utf-8' } 
        });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://flowbot-app.vercel.app"}/api/auth/facebook/callback`;

    // --- שימוש בגרסת API יציבה (v19.0) ---
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token Exchange Failed:", tokenData.error);
      return new NextResponse(generateCloseScript('ERROR', 'כשל בהחלפת הטוקן מול פייסבוק.'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    const accessToken = tokenData.access_token;

    // --- שליפת פרטים ---
    let fetchedWabaId = null;
    let fetchedPhoneId = null;
    let extraMetadata = {};

    try {
        const detailsUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,accounts{name,phone_numbers{id,display_phone_number}}&access_token=${accessToken}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();

        if (detailsData.accounts?.data?.[0]) {
            const account = detailsData.accounts.data[0];
            fetchedWabaId = account.id;
            if (account.phone_numbers?.data?.[0]) {
                fetchedPhoneId = account.phone_numbers.data[0].id;
            }
        }
        extraMetadata = { facebookDetails: detailsData };
    } catch (e) {
        console.warn("Could not fetch extra FB details, continuing anyway...");
    }

    // --- שמירה לדאטה בייס (IntegrationConnection) ---
    await prisma.integrationConnection.upsert({
        where: {
            userId_provider: {
                userId: session.id,
                // תיקון: שימוש ב-Enum
                provider: IntegrationProvider.FACEBOOK
            }
        },
        update: {
            status: "CONNECTED",
            accessToken: accessToken,
            metadata: {
                ...extraMetadata,
                wabaId: fetchedWabaId,
                phoneNumberId: fetchedPhoneId,
                updatedAt: new Date().toISOString()
            }
        },
        create: {
            userId: session.id,
            // תיקון: שימוש ב-Enum
            provider: IntegrationProvider.FACEBOOK,
            status: "CONNECTED",
            accessToken: accessToken,
            metadata: {
                ...extraMetadata,
                wabaId: fetchedWabaId,
                phoneNumberId: fetchedPhoneId,
                createdAt: new Date().toISOString()
            }
        }
    });

    // ==============================================================================
    // תוספת חיונית: יצירת WabaConnection כדי שהבוט יזהה את המספר המחובר
    // ==============================================================================
    if (fetchedWabaId && fetchedPhoneId) {
        await prisma.wabaConnection.upsert({
            where: { 
                phoneNumberId: fetchedPhoneId 
            },
            update: {
                userId: session.id,
                wabaId: fetchedWabaId,
                accessToken: accessToken,
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                userId: session.id,
                phoneNumberId: fetchedPhoneId,
                wabaId: fetchedWabaId,
                accessToken: accessToken,
                name: "WhatsApp Bot",
                isActive: true
            }
        });
        console.log("✅ WabaConnection linked successfully for:", fetchedPhoneId);
    }
    // ==============================================================================

    // --- סיום מוצלח ---
    return new NextResponse(generateCloseScript('SUCCESS', 'הפייסבוק חובר בהצלחה!'), { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    });

  } catch (err: any) {
    console.error("Callback Critical Error:", err);
    return new NextResponse(
        `<html><body><h1>שגיאת שרת</h1><p>נא לבדוק את הלוגים ב-Vercel.</p><script>window.close();</script></body></html>`, 
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
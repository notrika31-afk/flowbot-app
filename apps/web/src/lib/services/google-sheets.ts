import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const googleSheetsService = {
  async appendDynamicRow(userId: string, spreadsheetId: string, dataArray: any[]) {
    // 1. משיכת החיבור מהדאטה-בייס
    const connection = await prisma.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: "GOOGLE_SHEETS" as any,
        },
      },
    });

    if (!connection || !connection.refreshToken) {
      throw new Error("Sheets connection not found or missing refresh token");
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oAuth2Client.setCredentials({ 
        access_token: connection.accessToken, 
        refresh_token: connection.refreshToken,
        expiry_date: connection.expiresAt ? connection.expiresAt.getTime() : undefined,
    });

    // 2. מנגנון רענון טוקן אוטומטי (כדי שהחיבור לא ייפול באמצע הסרטון)
    const isExpired = connection.expiresAt 
      ? new Date().getTime() > connection.expiresAt.getTime() - 5 * 60 * 1000 
      : true;

    if (isExpired) {
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        await prisma.integrationConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: credentials.access_token,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
            ...(credentials.refresh_token && { refreshToken: credentials.refresh_token }),
          },
        });
        oAuth2Client.setCredentials(credentials);
      } catch (error) {
        console.error("[Sheets Service] Failed to refresh token", error);
        throw new Error("Failed to refresh Google Sheets token");
      }
    }

    const sheets = google.sheets({ version: "v4", auth: oAuth2Client });

    // 3. הוספת השורה לגיליון
    return await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: "Sheet1!A1", 
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [dataArray], // כאן יכנסו המשתנים האמיתיים: [name, phone, date...]
      },
    });
  }
};
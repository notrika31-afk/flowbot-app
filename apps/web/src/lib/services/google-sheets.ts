import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const googleSheetsService = {
  async appendDynamicRow(userId: string, spreadsheetId: string, dataArray: any[]) {
    const connection = await prisma.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: "GOOGLE_SHEETS" as any,
        },
      },
    });

    if (!connection) throw new Error("Sheets connection not found for user");

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oAuth2Client.setCredentials({ 
        access_token: connection.accessToken, 
        refresh_token: connection.refreshToken 
    });

    const sheets = google.sheets({ version: "v4", auth: oAuth2Client });

    return await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: "Sheet1!A1", 
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [dataArray], 
      },
    });
  }
};
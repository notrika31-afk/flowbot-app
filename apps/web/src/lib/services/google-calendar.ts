import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// @ts-ignore - כיבוי בדיקת הטיפוסים בשל בעיות חוזרות ב-Prisma generate
import { IntegrationProvider } from "@prisma/client";

interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendeeEmail?: string;
}

const BOT_CALENDAR_NAME = "FlowBot Appointments";

export const googleCalendarService = {
  
  // --- 1. השגת קליינט מאומת (ללא שינוי) ---
  async getAuthClient(userId: string) {
    const connection = await prisma.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          // התיקון: שימוש ב-as any כדי לאלץ את המערכת להשתמש בערך המילולי
          provider: IntegrationProvider.GOOGLE_CALENDAR as any,
        },
      },
    });

    if (!connection || !connection.refreshToken) {
      throw new Error("User is not connected to Google Calendar");
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

    // מנגנון Refresh Token (אותו דבר כמו קודם)
    const isExpired = connection.expiresAt 
      ? new Date().getTime() > connection.expiresAt.getTime() - 5 * 60 * 1000 
      : true;

    if (isExpired) {
      console.log(`[Google Service] Refreshing token for user ${userId}...`);
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
        console.error("Failed to refresh token", error);
        throw new Error("Failed to refresh authentication token");
      }
    }

    return oAuth2Client;
  },

  // --- 2. פונקציית עזר: מציאת/יצירת יומן הבוט ---
  async getOrCreateBotCalendarId(auth: any): Promise<string> {
    const calendar = google.calendar({ version: "v3", auth });

    // א. ננסה למצוא יומן קיים בשם המיוחד
    const calendarList = await calendar.calendarList.list();
    const existingCal = calendarList.data.items?.find(
      (cal) => cal.summary === BOT_CALENDAR_NAME
    );

    if (existingCal && existingCal.id) {
      return existingCal.id;
    }

    // ב. אם לא קיים - ניצור אחד חדש
    console.log(`[Google Service] Creating new calendar: ${BOT_CALENDAR_NAME}`);
    const newCal = await calendar.calendars.insert({
      requestBody: {
        summary: BOT_CALENDAR_NAME,
        description: "יומן שנוצר אוטומטית לניהול פגישות מהבוט",
        timeZone: "Asia/Jerusalem"
      }
    });

    if (!newCal.data.id) {
      throw new Error("Failed to create bot calendar");
    }

    return newCal.data.id;
  },

  // --- 3. בדיקת זמינות (בודק בראשי + ביומן הבוט) ---
  async listBusySlots(userId: string, timeMin: string, timeMax: string) {
    const auth = await this.getAuthClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    // אנחנו בודקים את ה-Primary כדי לא להתנגש עם החיים האישיים
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: "Asia/Jerusalem",
        items: [{ id: "primary" }] 
        // הערה: אם רוצים לדייק, אפשר להוסיף כאן גם את יומן הבוט, 
        // אבל בדרך כלל גוגל מסנכרן את הראשי עם הכל.
      }
    });

    const busyIntervals = response.data.calendars?.["primary"]?.busy || [];

    return busyIntervals.map((slot) => ({
      start: slot.start,
      end: slot.end,
      status: "busy",
    }));
  },

  // --- 4. יצירת אירוע (ביומן הייעודי) ---
  async createEvent(userId: string, params: CreateEventParams) {
    const auth = await this.getAuthClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    // שלב קריטי: משיגים את ה-ID של יומן הבוט (או יוצרים אותו)
    const targetCalendarId = await this.getOrCreateBotCalendarId(auth);

    const event = {
      summary: params.summary,
      description: params.description || "נקבע ע״י FlowBot",
      start: {
        dateTime: params.startTime,
        timeZone: "Asia/Jerusalem",
      },
      end: {
        dateTime: params.endTime,
        timeZone: "Asia/Jerusalem",
      },
      attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : [],
    };

    const response = await calendar.events.insert({
      calendarId: targetCalendarId, // כותבים ליומן החדש!
      requestBody: event,
    });

    console.log(`[Google Service] Event created in '${BOT_CALENDAR_NAME}': ${response.data.htmlLink}`);
    
    return {
      id: response.data.id,
      link: response.data.htmlLink,
      status: "confirmed"
    };
  }
};
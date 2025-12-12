import "./globals.css";
import type { Metadata } from "next";
import { Assistant } from "next/font/google"; // שיניתי ל-Assistant שמתאים יותר לעברית מ-Inter
import MainHeader from "@/components/FlowBotHeader"; // <--- ודא שהקובץ קיים
import { getUserSession } from "@/lib/auth";      // <--- הפונקציה החדשה

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const font = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FlowBot AI",
  description: "בנה בוט וואטסאפ חכם לעסק בדקות",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // בדיקת סשן בשרת (Server Side) לפני שהדף נשלח ללקוח
  const user = await getUserSession();

  return (
    <html lang="he" dir="rtl">
      <body
        className={`
          ${font.className}
          min-h-screen
          bg-[#f5f5f8]
          text-slate-900
          antialiased
          flex flex-col
        `}
      >
        {/* ה-Header מקבל את המשתמש ומחליט לבד אם להציג שם או כפתור התחברות */}
        {/* @ts-ignore */}
        <MainHeader user={user} />

        <main className="flex-1 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
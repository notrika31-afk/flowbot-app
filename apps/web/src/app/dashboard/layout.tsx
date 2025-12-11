"use client";

import "@/app/globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

// עדכנתי את הרשימה: ללא הגדרות, ללא חיבורים, ותיקון נתיב האוטומציות
const NAV_ITEMS = [
  { href: "/dashboard", label: "דשבורד", icon: "🏠" },
  { href: "/dashboard/bots", label: "הבוטים שלי", icon: "🤖" },
  { href: "/dashboard/automations", label: "אוטומציות", icon: "⚡" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen w-full bg-[#e9edf5] text-slate-900 flex items-center justify-center p-4">

        {/* ===== FRAME חיצוני ===== */}
        <div className="relative w-full max-w-7xl mx-auto rounded-[46px] border-2 border-slate-900 bg-[#f5f7fb] shadow-[0_20px_60px_rgba(15,23,42,0.2)] overflow-hidden min-h-[90vh]">

          {/* רקע דקורטיבי עדין בתוך המסגרת */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10% 10%, rgba(80,109,255,0.1), transparent 50%), radial-gradient(circle at 90% 90%, rgba(45,212,191,0.1), transparent 50%)",
            }}
          />
          
          {/* ===== תוכן הדשבורד ===== */}
          <div className="relative z-10 flex min-h-[90vh] p-6 gap-6">

            {/* Sidebar - עודכן למראה Neo-Brutalist (גבול עבה) */}
            <aside
              className="
                hidden md:flex flex-col w-64
                bg-white border-2 border-slate-900
                rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)]
                overflow-hidden
              "
            >
              {/* לוגו */}
              <div className="px-6 pt-6 pb-5 border-b-2 border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    FlowBot
                  </span>
                  <span className="text-slate-900 font-black text-xl tracking-tight">
                    Dashboard
                  </span>
                </div>
                {/* אייקון לוגו */}
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs tracking-widest shadow-sm">
                  FB
                </div>
              </div>

              {/* ניווט */}
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 border-2",
                        active
                          ? "bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] translate-x-[-2px] translate-y-[-2px]"
                          : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900",
                      ].join(" ")}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* פוטר סיידבר */}
              <div className="p-4 border-t-2 border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-400 mb-1">התוכנית שלך</p>
                  <p className="text-sm font-black text-slate-900">Pro Plan 🚀</p>
                </div>
              </div>
            </aside>

            {/* Main Content Area - עודכן למראה תואם */}
            <main
              className="
                flex-1 flex flex-col
                bg-white border-2 border-slate-900
                rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)]
                overflow-hidden relative
              "
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

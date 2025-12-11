"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiCpu,
  FiMessageCircle,
  FiZap,
  FiPlus,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import { motion } from "framer-motion"; // ייבוא Framer Motion

// אנימציות כניסה לכרטיסים
const stagger = {
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type Bot = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  messagesCount: number;
  flowsCount: number;
  whatsappActive: boolean;
};

// עיצוב כפתור ראשי (כחול)
const newButtonClass = `
  inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-white
  px-5 py-2.5 bg-[#506DFF]
  shadow-[0_10px_25px_rgba(80,109,255,0.45)] 
  hover:shadow-[0_16px_40px_rgba(80,109,255,0.6)] 
  hover:-translate-y-[1px]
  transition
`;

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBots() {
    try {
      const res = await fetch("/api/bots/list");
      const data = await res.json();

      if (res.ok) {
        setBots(data.bots);
      }
    } catch (e) {
      console.error("ERROR:", e);
      // במקרה של שגיאה, עדיין סמן כטעינה הסתיימה
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBots();
  }, []);

  return (
    // הסרנו את הרקע החיצוני והשארנו רק את ה-padding הפנימי
    <div className="p-8 flex-1 overflow-y-auto" dir="rtl">
      {/* HEADER */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="flex items-center justify-between pb-4 border-b border-slate-200/70 mb-10"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            הבוטים שלך 🤖
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            נהל את כל הבוטים שלך בקלות וברמה מקצועית.
          </p>
        </div>

        <Link
          href="/dashboard/bots/create"
          className={newButtonClass}
        >
          <FiPlus className="text-xl" />
          <span>יצירת בוט חדש</span>
        </Link>
      </motion.div>

      {/* LOADING SKELETON */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-slate-100 rounded-3xl p-6 animate-pulse border border-slate-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="h-8 w-32 bg-slate-300 rounded-lg mb-4"></div>
              <div className="h-4 w-48 bg-slate-200 rounded mb-3"></div>
              <div className="h-4 w-20 bg-slate-200 rounded mb-3"></div>
              <div className="h-5 w-28 bg-slate-300 rounded-full mt-4"></div>
            </motion.div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && bots.length === 0 && (
        <div className="text-center mt-20 p-10 bg-white border border-slate-200 rounded-3xl shadow-lg max-w-lg mx-auto">
          <p className="text-slate-600 text-xl mb-4">
            אין לך עדיין בוטים 🤷‍♂️
          </p>

          <Link
            href="/dashboard/bots/create"
            className={newButtonClass + " px-6 py-3"}
          >
            <FiPlus />
            יצירת בוט ראשון
          </Link>
        </div>
      )}

      {/* BOTS GRID */}
      {!loading && bots.length > 0 && (
        <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {bots.map((bot, i) => (
            <motion.div variants={fadeUp} key={bot.id}>
                <Link
                href={`/dashboard/bots/${bot.id}`}
                // עיצוב כרטיס נקי, יוקרתי ומצלל
                className="bg-white border border-slate-200 rounded-3xl p-6 block hover:shadow-[0_12px_30px_rgba(80,109,255,0.1)] hover:border-[#506DFF]/30 transition"
                >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-slate-900">{bot.name}</h3>

                    {/* סטטוס חיבור: כחול/אדום עם אייקון */}
                    <div
                    className={`text-xl ${
                        bot.whatsappActive ? "text-emerald-500" : "text-red-500"
                    }`}
                    title={bot.whatsappActive ? "מחובר לוואטסאפ" : "לא מחובר"}
                    >
                    {bot.whatsappActive ? <FiWifi /> : <FiWifiOff />}
                    </div>
                </div>

                <p className="text-slate-600 mb-4 text-[13px]">
                    {bot.description || "ללא תיאור"}
                </p>

                {/* מטא-דאטה בתחתית */}
                <div className="flex items-center gap-6 text-slate-500 text-[13px] mt-4">
                    <div className="flex items-center gap-1.5">
                    <FiMessageCircle className="text-slate-500/80 text-lg" />
                    <span>{bot.messagesCount.toLocaleString('he-IL')} הודעות</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                    <FiZap className="text-slate-500/80 text-lg" />
                    <span>{bot.flowsCount.toLocaleString('he-IL')} אוטומציות</span>
                    </div>
                </div>

                <div className="text-[11px] text-slate-400 mt-3 border-t border-slate-100 pt-2">
                    <div className="flex items-center gap-1.5">
                        <FiCpu className="text-slate-400/80 text-base" />
                        <span>נוצר בתאריך: {new Date(bot.createdAt).toLocaleDateString("he-IL")}</span>
                    </div>
                </div>

                </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

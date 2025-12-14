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
  FiArrowRight
} from "react-icons/fi";
import { motion } from "framer-motion";

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

// עיצוב כפתור ראשי (כחול) - מותאם למובייל
const newButtonClass = `
  inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white
  px-5 py-3 md:py-2.5 bg-[#506DFF]
  shadow-[0_10px_25px_rgba(80,109,255,0.45)] 
  hover:shadow-[0_16px_40px_rgba(80,109,255,0.6)] 
  hover:-translate-y-[1px]
  transition
  w-full md:w-auto
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
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBots();
  }, []);

  return (
    // שינוי PADDING למובייל
    <div className="p-4 md:p-8 flex-1 overflow-y-auto" dir="rtl">
      
      {/* HEADER */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        // שינוי לפלקס טור בנייד
        className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/70 mb-6 md:mb-10 gap-4"
      >
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
                <Link href="/dashboard" className="text-slate-400 hover:text-slate-800 transition p-1 -mr-1">
                    <FiArrowRight size={20} />
                </Link>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                    הבוטים שלך 🤖
                </h1>
            </div>
          <p className="text-slate-600 mt-1 text-sm md:mr-8">
            נהל את כל הבוטים שלך בקלות וברמה מקצועית.
          </p>
        </div>

        {/* תוקן: מפנה ל-Builder */}
        <Link href="/builder" className={newButtonClass}>
          <FiPlus className="text-xl" />
          <span>יצירת בוט חדש</span>
        </Link>
      </motion.div>

      {/* LOADING SKELETON */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-slate-100 rounded-3xl p-6 animate-pulse border border-slate-200 h-48"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && bots.length === 0 && (
        <div className="text-center mt-10 md:mt-20 p-6 md:p-10 bg-white border border-slate-200 rounded-3xl shadow-lg max-w-lg mx-auto">
          <p className="text-slate-600 text-lg md:text-xl mb-4">
            אין לך עדיין בוטים 🤷‍♂️
          </p>

          <Link
            href="/builder"
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
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
        >
          {bots.map((bot, i) => (
            <motion.div variants={fadeUp} key={bot.id}>
                <Link
                href={`/dashboard/bots/${bot.id}`}
                className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 block hover:shadow-[0_12px_30px_rgba(80,109,255,0.1)] hover:border-[#506DFF]/30 transition group"
                >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-[#506DFF] transition-colors">{bot.name}</h3>

                    <div
                    className={`text-xl ${
                        bot.whatsappActive ? "text-emerald-500" : "text-red-500"
                    }`}
                    title={bot.whatsappActive ? "מחובר לוואטסאפ" : "לא מחובר"}
                    >
                    {bot.whatsappActive ? <FiWifi /> : <FiWifiOff />}
                    </div>
                </div>

                <p className="text-slate-600 mb-4 text-[13px] line-clamp-2">
                    {bot.description || "ללא תיאור"}
                </p>

                <div className="flex items-center gap-4 md:gap-6 text-slate-500 text-[13px] mt-4">
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
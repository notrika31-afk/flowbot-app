"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Edit3,
  MessageCircle,
  Users,
  Clock,
  PlayCircle,
  PauseCircle,
  Trash2,
  Settings,
  Activity,
  Smartphone
} from "lucide-react";

// --- Types ---
type BotDetails = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  phoneId: string;
  createdAt: string;
  stats: {
    messages: number;
    leads: number;
    avgResponseTime: string;
  };
  recentLogs: Array<{ id: string; time: string; action: string; status: "success" | "error" }>;
};

// --- Animations ---
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function SingleBotPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;

  const [bot, setBot] = useState<BotDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. טעינת נתוני הבוט
  useEffect(() => {
    async function fetchBot() {
      try {
        // כאן תהיה קריאה אמיתית לשרת: fetch(`/api/bots/${botId}`)
        // כרגע נשתמש בנתוני דמה כדי שתראה את העיצוב
        await new Promise((resolve) => setTimeout(resolve, 800)); // סימולציית טעינה

        setBot({
          id: botId,
          name: "הבוט הראשי לעסק",
          status: "ACTIVE",
          phoneId: "10594837...",
          createdAt: new Date().toISOString(),
          stats: {
            messages: 1240,
            leads: 45,
            avgResponseTime: "1.2s",
          },
          recentLogs: [
            { id: "1", time: "10:45", action: "ליד חדש נכנס", status: "success" },
            { id: "2", time: "10:32", action: "מענה אוטומטי נשלח", status: "success" },
            { id: "3", time: "09:15", action: "שגיאת חיבור ל-CRM", status: "error" },
          ]
        });
      } catch (error) {
        console.error("Failed to fetch bot", error);
      } finally {
        setLoading(false);
      }
    }

    if (botId) fetchBot();
  }, [botId]);

  // 2. פונקציית עריכה - מעבירה לבילדר עם ה-ID
  const handleEditFlow = () => {
    // מעבירים את ה-ID ב-Query Param כדי שהבילדר ידע לטעון אותו
    router.push(`/builder?botId=${botId}`);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-medium">טוען נתוני בוט...</span>
        </div>
      </div>
    );
  }

  if (!bot) return null;

  const isActive = bot.status === "ACTIVE";

  return (
    <div className="min-h-full w-full p-4 md:p-8 bg-[#fafafa] overflow-y-auto" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* --- Header --- */}
        <motion.header 
          initial="hidden" animate="show" variants={fadeUp}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-2">
            <Link 
              href="/dashboard/bots" 
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition py-1"
            >
              <ArrowRight size={16} />
              חזרה לרשימת הבוטים
            </Link>
            
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {bot.name}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isActive 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {isActive ? "פעיל" : "מושהה"}
              </span>
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <Smartphone size={14} />
              מחובר למספר (ID: {bot.phoneId})
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleEditFlow}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              <Edit3 size={18} />
              ערוך תסריט
            </button>
            <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition shadow-sm">
              <Settings size={20} />
            </button>
          </div>
        </motion.header>

        {/* --- Stats Grid --- */}
        <motion.div 
          initial="hidden" animate="show" variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <StatCard 
            label="הודעות שנשלחו" 
            value={bot.stats.messages.toLocaleString()} 
            icon={<MessageCircle size={20} />} 
            color="blue"
          />
          <StatCard 
            label="לידים שנאספו" 
            value={bot.stats.leads.toLocaleString()} 
            icon={<Users size={20} />} 
            color="emerald"
          />
          <StatCard 
            label="זמן תגובה ממוצע" 
            value={bot.stats.avgResponseTime} 
            icon={<Clock size={20} />} 
            color="purple"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- Recent Activity Logs --- */}
          <motion.div 
            initial="hidden" animate="show" variants={fadeUp}
            className="lg:col-span-2 bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity size={18} className="text-slate-400" />
              פעילות אחרונה
            </h3>
            
            <div className="space-y-4">
              {bot.recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-slate-700">{log.action}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{log.time}</span>
                </div>
              ))}
              
              {bot.recentLogs.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  אין עדיין פעילות לבוט זה.
                </div>
              )}
            </div>
          </motion.div>

          {/* --- Danger Zone / Actions --- */}
          <motion.div 
            initial="hidden" animate="show" variants={fadeUp}
            className="space-y-4"
          >
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm h-full">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">ניהול בוט</h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition text-right">
                  {isActive ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                  {isActive ? "השהה פעילות בוט" : "הפעל בוט"}
                </button>
                
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 text-red-600 bg-red-50/50 font-medium hover:bg-red-50 transition text-right">
                  <Trash2 size={18} />
                  מחק בוט לצמיתות
                </button>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// --- Sub Components ---

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  const bgColors: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600"
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:border-slate-300 transition-colors">
      <div className="flex justify-between items-start relative z-10">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${bgColors[color]} bg-opacity-50`}>
          {icon}
        </div>
      </div>
      <span className="text-3xl font-black text-slate-900 relative z-10">{value}</span>
      
      {/* Decorative Blob */}
      <div className={`absolute -bottom-4 -left-4 w-20 h-20 rounded-full blur-2xl opacity-40 bg-${color}-200 group-hover:opacity-60 transition-opacity`} />
    </div>
  );
}
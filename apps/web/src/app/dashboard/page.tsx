"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Bot, Zap, Users, MessageCircle, ArrowLeft, Database, 
  Activity, Cpu, Server, Home 
} from "lucide-react";

// --- Types ---
type Overview = {
  activeBots: number;
  activeAutomations: number;
  newLeads: number;
  totalMessages: number;
};

// --- Animations ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 50, damping: 20 },
  },
};

export default function DashboardHome() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview>({
    activeBots: 0,
    activeAutomations: 0,
    newLeads: 0,
    totalMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("ברוך הבא");

  // Greeting Logic
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) setGreeting("בוקר טוב");
    else if (h >= 12 && h < 18) setGreeting("צהריים טובים");
    else setGreeting("ערב טוב");
  }, []);

  // Data Fetching
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/dashboard/overview");
        
        if (r.status === 401) {
          router.push("/login");
          return;
        }

        if (!r.ok) {
           console.warn("API not ready yet, using fallback data");
           setOverview({ activeBots: 0, activeAutomations: 0, newLeads: 0, totalMessages: 0 });
           setLoading(false);
           return;
        }

        const d = await r.json();
        setOverview(d);
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // --- Styles ---
  const cardBaseClass = `
    relative overflow-hidden bg-white 
    border-2 border-slate-900 rounded-2xl 
    shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] 
    hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] 
    transition-all duration-300 ease-out
    active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]
  `;

  // --- Components ---
  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <motion.div variants={itemVariants} className={`${cardBaseClass} p-5 md:p-6 flex flex-col justify-between h-28 md:h-32`}>
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${color}-100 rounded-full blur-2xl opacity-60 pointer-events-none`} />
      
      <div className="flex justify-between items-start z-10">
        <span className="text-slate-500 text-[10px] md:text-xs font-bold tracking-wider uppercase">{label}</span>
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
      </div>
      <div className="z-10 mt-auto">
        <span className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          {loading ? (
            <span className="animate-pulse bg-slate-100 h-8 w-16 rounded block" />
          ) : (
            (value ?? 0).toLocaleString("he-IL")
          )}
        </span>
      </div>
    </motion.div>
  );

  const ActionCard = ({ title, link, desc, cta }: { title: string; link: string; desc: string; cta: string }) => (
    <motion.div variants={itemVariants} whileHover="hover" whileTap="tap" className={`${cardBaseClass} flex flex-col group`}>
      <Link href={link} className="flex-1 p-6 md:p-8 flex flex-col h-full relative z-10">
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-slate-900 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4 md:mb-6 flex-1">
          {desc}
        </p>
        
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 group-hover:gap-3 transition-all">
          {cta} <ArrowLeft className="w-4 h-4" />
        </div>
      </Link>
    </motion.div>
  );

  if (loading) {
    return (
        <div className="min-h-full w-full p-6 sm:p-10 bg-[#fafafa] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm font-medium animate-pulse">טוען נתונים...</p>
            </div>
        </div>
    );
  }

  return (
    // שינוי PADDING למובייל
    <div className="min-h-full w-full p-4 md:p-10 bg-[#fafafa] relative overflow-y-auto" dir="rtl">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-100/40 rounded-full blur-3xl mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-100/40 rounded-full blur-3xl mix-blend-multiply" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-7xl mx-auto space-y-8 md:space-y-12 pb-20"
      >
        {/* Header Area with Back Button */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <motion.div variants={itemVariants} className="flex flex-col gap-1 md:gap-2 order-2 md:order-1">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                    {greeting}, בוס.
                </h1>
                <p className="text-slate-500 text-base md:text-lg font-medium">
                    הנה תמונת המצב של המערכת שלך להיום.
                </p>
            </motion.div>

            {/* Back Button - הותאם למובייל */}
            <motion.div variants={itemVariants} className="order-1 md:order-2 self-end md:self-auto">
                <Link 
                    href="/" 
                    className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-all shadow-sm"
                >
                    <Home size={14} className="md:w-4 md:h-4" />
                    חזרה לאתר
                </Link>
            </motion.div>
        </div>

        {/* Stats Grid - 2 בעמודה במובייל, 4 במחשב */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="בוטים פעילים" value={overview.activeBots} icon={Bot} color="blue" />
          <StatCard label="אוטומציות" value={overview.activeAutomations} icon={Zap} color="yellow" />
          <StatCard label="לידים חדשים" value={overview.newLeads} icon={Users} color="emerald" />
          <StatCard label="הודעות" value={overview.totalMessages} icon={MessageCircle} color="purple" />
        </div>

        {/* Quick Actions */}
        <div>
          <motion.h2 variants={itemVariants} className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" /> 
            פעולות מהירות
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <ActionCard 
              title="בניית בוט חדש" 
              link="/builder" 
              desc="השתמש בממשק ה-Flow הוויזואלי כדי ליצור בוט חכם מאפס או מתבנית."
              cta="פתח את ה-Builder"
            />
            <ActionCard 
              title="ניהול בוטים" 
              link="/dashboard/bots" 
              desc="צפה בביצועים, ערוך תסריטים ונהל את הבוטים הפעילים שלך."
              cta="לרשימת הבוטים"
            />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <motion.div 
            variants={itemVariants} 
            className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 md:p-10 relative overflow-hidden text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10 max-w-lg">
              <h2 className="text-xl md:text-2xl font-bold mb-2">רוצה לשדרג את ה-AI? 🧠</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                טען מסמכי PDF, טקסטים חופשיים או כתובות URL כדי לאמן את ה-Engine AI שלך.
              </p>
            </div>
            <Link
              href="/dashboard/ai-training"
              className="relative z-10 whitespace-nowrap px-5 py-2.5 md:px-6 md:py-3 bg-white text-slate-900 font-bold rounded-xl shadow hover:bg-slate-100 hover:scale-105 transition-all flex items-center gap-2 text-sm md:text-base w-full md:w-auto justify-center"
            >
              העלאת ידע
              <Zap className="w-4 h-4 fill-current" />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className={`${cardBaseClass} !border-slate-200 !shadow-sm p-5 md:p-6 flex flex-col`}>
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
               <Activity className="w-4 h-4" />
               סטטוס מערכת
             </h3>
             <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
               <StatusRow label="Database" status="Connected" icon={Database} />
               <StatusRow label="WhatsApp API" status="Active" icon={MessageCircle} />
               <StatusRow label="AI Engine" status="Ready" icon={Cpu} />
               <StatusRow label="Latency" status="24ms" icon={Server} />
             </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function StatusRow({ label, status, icon: Icon }: { label: string; status: string; icon: any }) {
  const isReady = status === 'Active' || status === 'Connected' || status === 'Ready';
  return (
    <div className="flex items-center justify-between text-sm group">
      <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-900 transition-colors">
        <Icon className="w-4 h-4" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full transition-shadow duration-500 ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-yellow-500'}`} />
        <span className="font-bold text-slate-700">{status}</span>
      </div>
    </div>
  );
}
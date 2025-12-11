"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ===== Types ===== */
type AutomationStatus = "active" | "paused" | "draft";

type Automation = {
  id: string;
  name: string;
  trigger: string; // למשל: "מילת מפתח", "AI Intent", "טופס ליד"
  triggerIcon: string;
  stats: {
    runs: number;
    successRate: string;
  };
  status: AutomationStatus;
  lastEdited: string;
};

/* ===== Mock Data ===== */
const initialAutomations: Automation[] = [
  {
    id: "1",
    name: "ברכת ברוכים הבאים",
    trigger: "הודעה ראשונה",
    triggerIcon: "👋",
    stats: { runs: 1240, successRate: "99%" },
    status: "active",
    lastEdited: "לפני שעתיים",
  },
  {
    id: "2",
    name: "סינון לידים (AI)",
    trigger: "זיהוי כוונת רכישה",
    triggerIcon: "🧠",
    stats: { runs: 85, successRate: "82%" },
    status: "active",
    lastEdited: "אתמול",
  },
  {
    id: "3",
    name: "תיאום פגישה ביומן",
    trigger: "מילת מפתח: 'פגישה'",
    triggerIcon: "📅",
    stats: { runs: 42, successRate: "60%" },
    status: "paused",
    lastEdited: "לפני 3 ימים",
  },
  {
    id: "4",
    name: "מענה מחוץ לשעות פעילות",
    trigger: "זמן: 18:00 - 08:00",
    triggerIcon: "🌙",
    stats: { runs: 0, successRate: "0%" },
    status: "draft",
    lastEdited: "לפני שבוע",
  },
];

/* ===== Animations ===== */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(initialAutomations);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  // Toggle Status Logic
  const toggleStatus = (id: string) => {
    setAutomations((prev) =>
      prev.map((auto) => {
        if (auto.id === id) {
          const newStatus = auto.status === "active" ? "paused" : "active";
          return { ...auto, status: newStatus as AutomationStatus };
        }
        return auto;
      })
    );
  };

  // Filter Logic
  const filteredList = automations.filter((a) =>
    filter === "all" ? true : a.status === filter
  );

  return (
    <div className="min-h-full w-full p-6 sm:p-10 bg-[#fafafa] overflow-y-auto" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              אוטומציות ⚡
            </h1>
            <p className="text-slate-500 text-lg">
              נהל את התסריטים והתגובות האוטומטיות של הבוט שלך.
            </p>
          </div>

          <Link
            href="/builder"
            className="group flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <span className="text-xl">+</span>
            צור אוטומציה חדשה
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <FilterChip label="הכל" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label="פעילים בלבד" active={filter === "active"} onClick={() => setFilter("active")} />
          <FilterChip label="מושהים" active={filter === "paused"} onClick={() => setFilter("paused")} />
        </div>

        {/* Automations Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredList.map((automation) => (
              <AutomationCard
                key={automation.id}
                data={automation}
                onToggle={() => toggleStatus(automation.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredList.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <p className="text-xl font-bold text-slate-400">לא נמצאו אוטומציות התואמות לסינון.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Components ===== */

function AutomationCard({
  data,
  onToggle,
}: {
  data: Automation;
  onToggle: () => void;
}) {
  const isActive = data.status === "active";
  const isDraft = data.status === "draft";

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className={`
        relative flex flex-col justify-between
        bg-white border-2 border-slate-900 rounded-2xl p-6
        shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]
        hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]
        transition-all duration-300
        ${isDraft ? "opacity-70 grayscale-[0.5] border-dashed" : ""}
      `}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xl">
            {data.triggerIcon}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">{data.name}</h3>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
              {data.trigger}
            </span>
          </div>
        </div>
        
        {/* iOS Toggle Switch */}
        {!isDraft && (
          <button
            onClick={onToggle}
            className={`
              w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300
              ${isActive ? "bg-[#B4F76D] border-2 border-slate-900" : "bg-slate-200 border-2 border-slate-300"}
            `}
          >
            <motion.div
              layout
              className={`
                bg-white w-4 h-4 rounded-full shadow-sm border border-slate-200
              `}
              animate={{
                x: isActive ? 0 : 20, // RTL: Active (left) vs Inactive (right) adjustment might be needed depending on direction
                backgroundColor: isActive ? "#0F172A" : "#FFFFFF"
              }}
              // Manual override for RTL direction since flex-direction might confuse framer sometimes
              style={{ marginLeft: isActive ? "0" : "auto", marginRight: isActive ? "auto" : "0" }}
            />
          </button>
        )}
        {isDraft && (
          <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
            טיוטה
          </span>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">הפעלות</span>
          <span className="font-mono font-bold text-slate-700">{data.stats.runs.toLocaleString()}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">הצלחה</span>
          <span className="font-mono font-bold text-slate-700">{data.stats.successRate}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100">
        <button className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1">
          ✏️ עריכה
        </button>
        <button className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors ml-auto">
          לוגים
        </button>
        <div className="text-[10px] text-slate-400 font-medium">
          נערך {data.lastEdited}
        </div>
      </div>
    </motion.div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2
        ${
          active
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
        }
      `}
    >
      {label}
    </button>
  );
}

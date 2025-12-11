"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/* ===== הגדרת סוגי נתונים ===== */
type Integration = {
  id: string;
  name: string;
  desc: string;
  category: "Messaging" | "AI" | "CRM" | "Tools";
  icon: string;
  connected: boolean;
};

/* ===== נתונים ראשוניים (Mock) ===== */
const initialIntegrations: Integration[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    desc: "חיבור למספר הטלפון העסקי לשליחת וקבלת הודעות.",
    category: "Messaging",
    icon: "💬",
    connected: true,
  },
  {
    id: "openai",
    name: "OpenAI (GPT-4)",
    desc: "מנוע הבינה המלאכותית לניתוח שפה ויצירת תשובות.",
    category: "AI",
    icon: "🧠",
    connected: true,
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    desc: "שמירת לידים ונתונים בזמן אמת בגיליון אלקטרוני.",
    category: "Tools",
    icon: "📊",
    connected: false,
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    desc: "סנכרון אוטומטי של אנשי קשר ושיחות למערכת ה-CRM.",
    category: "CRM",
    icon: "💼",
    connected: false,
  },
  {
    id: "calendly",
    name: "Calendly",
    desc: "שליחת קישור לקביעת פגישה בתוך השיחה באופן אוטומטי.",
    category: "Tools",
    icon: "📅",
    connected: false,
  },
];

/* ===== אנימציות ===== */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // פונקציה לטיפול בשינוי סטטוס חיבור
  const toggleConnection = async (id: string) => {
    setLoadingId(id);
    
    // סימולציה של קריאת API
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, connected: !item.connected } : item
      )
    );
    setLoadingId(null);
  };

  return (
    <div className="min-h-full w-full p-6 sm:p-10 bg-[#fafafa] overflow-y-auto" dir="rtl">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto"
      >
        {/* כותרת */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            אינטגרציות וחיבורים 🔗
          </h1>
          <p className="text-slate-500 text-lg">
            נהל את החיבורים החיצוניים של הבוט שלך במקום אחד.
          </p>
        </div>

        {/* רשימת אינטגרציות */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((item) => (
            <IntegrationCard
              key={item.id}
              data={item}
              onToggle={() => toggleConnection(item.id)}
              isLoading={loadingId === item.id}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ===== רכיב כרטיס אינטגרציה ===== */
function IntegrationCard({
  data,
  onToggle,
  isLoading,
}: {
  data: Integration;
  onToggle: () => void;
  isLoading: boolean;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={`
        relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300
        flex flex-col justify-between gap-4
        ${
          data.connected
            ? "bg-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            : "bg-slate-50 border-slate-200 shadow-none grayscale-[0.5] hover:grayscale-0 hover:border-slate-400"
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          {/* אייקון */}
          <div className="w-12 h-12 rounded-xl bg-slate-100 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-sm">
            {data.icon}
          </div>
          
          {/* טקסט */}
          <div>
            <h3 className="font-bold text-slate-900 text-lg leading-tight">
              {data.name}
            </h3>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
              {data.category}
            </span>
          </div>
        </div>

        {/* מתג (Toggle) */}
        <button
          onClick={onToggle}
          disabled={isLoading}
          className={`
            relative w-14 h-8 rounded-full border-2 border-slate-900 transition-colors flex items-center px-1
            ${data.connected ? "bg-[#B4F76D]" : "bg-slate-200"}
          `}
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`
              w-5 h-5 bg-slate-900 rounded-full shadow-sm
              ${data.connected ? "translate-x-0" : "translate-x-6"} 
              ${isLoading ? "animate-pulse" : ""}
            `}
            // הערה: בגלל RTL ייתכן שנצטרך להפוך כיוון, כאן הותאם ויזואלית
            style={{ marginLeft: data.connected ? "0" : "auto", marginRight: data.connected ? "auto" : "0" }}
          />
        </button>
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mt-2">
        {data.desc}
      </p>

      {/* סטטוס טקסטואלי */}
      <div className="flex items-center gap-2 text-xs font-bold pt-4 border-t border-slate-100 mt-2">
        <span
          className={`w-2 h-2 rounded-full ${
            data.connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
          }`}
        />
        <span className={data.connected ? "text-emerald-700" : "text-slate-400"}>
          {data.connected ? "מחובר ופעיל" : "לא מחובר"}
        </span>
      </div>
    </motion.div>
  );
}

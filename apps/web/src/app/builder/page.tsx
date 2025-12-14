"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot as BotIcon,
  Sparkles,
  GraduationCap,
  FileStack,
  History,
  Play,
  ArrowRight,
  LayoutGrid,
  Database,
  X,
  Globe,
  Loader2,
  Send,
  CheckCircle2,
  RefreshCcw,
  Link2,
  Menu // הוספתי אייקון לתפריט מובייל
} from "lucide-react";

/* ---------- Types ---------- */
type Role = "user" | "bot";
type Msg = { role: Role; text: string };
type Phase = "intro" | "build" | "edit";

type StepButton = {
  label?: string;
  text?: string;
  go?: string;
  next_step_id?: string;
  next_step?: string;
  next?: string;
};

type StepDef = {
  id?: string;
  type: string;
  title?: string;
  content?: string;
  variable?: string; 
  next?: string;
  next_step_id?: string;
  buttons?: StepButton[];
  options?: StepButton[];
  trigger_keywords?: string[];
};

type Flow = {
  goal: string;
  business?: any;
  steps: StepDef[];
};

/* ---------- Utils ---------- */
const extractUrl = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

/* ---------- Animations ---------- */
const fade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

/* ---------- NLP HELPERS (Local Intelligence) ---------- */
const canonicalVars = ["service", "date", "time", "name", "phone", "notes"] as const;
type CanonicalVar = (typeof canonicalVars)[number];

const normalize = (txt: string | undefined | null) =>
  (txt || "")
    .toLowerCase()
    .replace(/[\"׳״']/g, "")
    .trim();

function extractTime(raw: string): string | undefined {
  const text = normalize(raw);
  const timeWithColon = text.match(/(\d{1,2}[:.]\d{2})/);
  if (timeWithColon) return timeWithColon[1].replace(".", ":");
  
  const hourMatch = text.match(/(?:בשעה|ב|ל)\s*(\d{1,2})\b/);
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10);
    if (h >= 0 && h <= 23) return `${h.toString().padStart(2, "0")}:00`;
  }
  return undefined;
}

function extractDate(raw: string): string | undefined {
  const text = normalize(raw);
  if (text.includes("מחרתיים")) return "מחרתיים";
  if (text.includes("מחר")) return "מחר";
  if (text.includes("היום")) return "היום";

  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const foundDay = days.find((d) => text.includes(d));
  if (foundDay) return foundDay;

  const dateMatch = text.match(/\b(\d{1,2}[\/\.\-]\d{1,2}(?:[\/\.\-]\d{2,4})?)\b/);
  if (dateMatch) {
    return dateMatch[1].replace(/\./g, "/").replace(/\-/g, "/");
  }
  return undefined;
}

function extractPhone(raw: string): string | undefined {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length >= 9 && digits.length <= 11 && digits.startsWith("0")) {
    return digits;
  }
  return undefined;
}

function extractName(raw: string): string | undefined {
  const text = raw.trim();
  if (text.split(" ").length <= 3 && text.length > 2 && !/\d/.test(text)) {
      const stops = ["היי", "ביי", "תודה", "רוצה", "לקבוע", "כן", "לא", "בטח", "אוקיי"];
      if (!stops.some(s => text.includes(s))) return text;
  }
  return undefined;
}

function extractEntities(raw: string) {
  const entities: Record<string, string> = {};
  const date = extractDate(raw);
  const time = extractTime(raw);
  const phone = extractPhone(raw);
  let name = undefined;
  if (!date && !time && !phone) {
      name = extractName(raw);
  }

  if (date) entities["date"] = date;
  if (time) entities["time"] = time;
  if (phone) entities["phone"] = phone;
  if (name) entities["name"] = name;
  
  if (raw.includes("לק") || raw.includes("ג'ל") || raw.includes("מניקור")) entities["service"] = "לק ג'ל";
  if (raw.includes("פדיקור")) entities["service"] = "פדיקור";

  return entities;
}

/* =========================================================
 * MAIN COMPONENT
 * ======================================================= */

export default function BuilderPage() {
  const router = useRouter();

  /* ---------- Chat state ---------- */
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: "היי 👋 אני FlowBot. ספר לי על העסק, וניצור בוט חכם יחד. יש לך אתר? שלח לי לינק ואסרוק אותו.",
    },
  ]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [persistentScanData, setPersistentScanData] = useState<any>(null);
  
  const endRef = useRef<HTMLDivElement | null>(null);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Flow state ---------- */
  const [flow, setFlow] = useState<Flow | null>(null);
  const [flowReady, setFlowReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");

  /* ---------- Simulation state ---------- */
  const [simulateMode, setSimulateMode] = useState(false);

  /* ---------- Modals & Mobile Menu ---------- */
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showImproveModal, setShowImproveModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // מצב תפריט מובייל

  /* ---------- Persistence & Re-hydration ---------- */
  useEffect(() => {
    const localFlow = localStorage.getItem("flowbot_draft_flow");
    const localMsgs = localStorage.getItem("flowbot_chat_history");
    const localPhase = localStorage.getItem("flowbot_phase");

    if (localFlow) {
      try {
        setFlow(JSON.parse(localFlow));
        setFlowReady(true);
      } catch (e) { console.error(e); }
    }

    if (localMsgs) {
      try {
        const parsedMsgs = JSON.parse(localMsgs);
        if (parsedMsgs.length > 0) setMsgs(parsedMsgs);
      } catch (e) { console.error(e); }
    }
    
    if (localPhase) {
        setPhase(localPhase as Phase);
    }
    
    const justReturned = sessionStorage.getItem("returned_from_connect");
    if (justReturned) {
        sessionStorage.removeItem("returned_from_connect");
        triggerSystemCheck(); 
    }

  }, []);

  useEffect(() => {
    if (msgs.length > 1) {
        localStorage.setItem("flowbot_chat_history", JSON.stringify(msgs));
    }
    localStorage.setItem("flowbot_phase", phase);
  }, [msgs, phase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, isScanning]);


  /* ---------- System Check ---------- */
  async function triggerSystemCheck() {
      setBusy(true);
      try {
          setMsgs(prev => prev.filter(m => !m.text.includes("מעביר אותך למסך החיבורים")));

          const res = await fetch("/api/ai/engine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "SYSTEM_CHECK_INTEGRATIONS", 
              history: msgs, 
              phase: phase,
              currentFlow: flow
            }),
          });
          
          const data = await res.json();
          if (data.reply) {
              setMsgs(prev => [...prev, { role: "bot", text: data.reply }]);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setBusy(false);
      }
  }

  /* ---------- Engine Interaction ---------- */
  async function sendMsg() {
    const text = input.trim();
    if (!text || busy || isScanning) return;

    if (text === "לחבר" || text === "כן, לחבר" || text.includes("לחבר יומן") || text.includes("לחבר תשלום")) {
        handleConnectRedirect(text);
        return;
    }

    if (flowReady && (
        text === "כן" || 
        text === "כן." || 
        text === "המשך" || 
        text === "מאשר" || 
        text === "מעולה" ||
        text.includes("להתחבר") ||
        text.includes("שלב הבא")
    )) {
        handleConnectRedirect(text);
        return;
    }

    setInput("");
    const newMsgs = [...msgs, { role: "user", text } as Msg];
    setMsgs(newMsgs);
    setBusy(true);

    let phaseForRequest: Phase = phase;
    if (flowReady) {
      phaseForRequest = "edit";
    } else {
      phaseForRequest = phase === "intro" ? "build" : phase;
    }
    setPhase(phaseForRequest);

    let currentScanData = null;
    let isFreshScan = false;
    const detectedUrl = extractUrl(text);

    if (detectedUrl) {
      setIsScanning(true);
      try {
        const scanRes = await fetch("/api/tools/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: detectedUrl }),
        });

        if (scanRes.ok) {
          const result = await scanRes.json();
          if (result.success && result.data) {
            currentScanData = {
              type: "scraped_website",
              content: JSON.stringify(result.data),
              name: "Website Scan",
            };
            setPersistentScanData(currentScanData);
            isFreshScan = true;
          }
        }
      } catch (err) {
        console.error("Scan failed", err);
      } finally {
        setIsScanning(false);
      }
    }

    const attachmentToSend = currentScanData || persistentScanData;

    try {
      const res = await fetch("/api/ai/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newMsgs,
          sessionId: "local-builder",
          phase: phaseForRequest,
          currentFlow: flow,
          attachments: attachmentToSend ? [attachmentToSend] : [],
          isFreshScan: isFreshScan,
        }),
      });

      const data = await res.json();
      let reply = (data?.reply as string) || "משהו השתבש רגעית.";

      if (reply.includes("[CONNECT_TRIGGER]")) {
          reply = reply.replace("[CONNECT_TRIGGER]", "");
          setMsgs((m) => [...m, { role: "bot", text: reply }]);
      } else {
          setMsgs((m) => [...m, { role: "bot", text: reply }]);
      }
      
      if (data.flow) {
        const flowData = data.flow as Flow;
        setFlow(flowData);
        setFlowReady(true);
        localStorage.setItem("flowbot_draft_flow", JSON.stringify(flowData));

        setMsgs((m) => [...m, { role: "bot", text: "יש לי תסריט מוכן! בוא נעשה סימולציה 👇" }]);

        if (!simulateMode) {
            setSimulateMode(true);
            setTimeout(() => {
                // גלילה חלקה לסימולציה
                mainContainerRef.current?.scrollTo({ top: mainContainerRef.current.scrollHeight, behavior: 'smooth' });
            }, 100);
            
            setTimeout(() => {
                setMsgs(prev => [...prev, { 
                    role: "bot", 
                    text: "אם הכל כשורה, תגיד לי \"כן\" ואעביר אותך לחיבור המערכות הסופי 🚀" 
                }]);
                endRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 2000); 
        }
      }

    } catch (e) {
      console.error(e);
      setMsgs((m) => [...m, { role: "bot", text: "⚠️ שגיאת תקשורת עם המנוע." }]);
    } finally {
      setBusy(false);
    }
  }

  function handleConnectRedirect(userText: string) {
      sessionStorage.setItem("returned_from_connect", "true");
      setInput(""); 
      setMsgs(prev => [...prev, { role: "user", text: userText }]);
      setMsgs(prev => [...prev, { role: "bot", text: "מעולה! אני מעביר אותך למסך החיבורים. כשתסיים, פשוט תחזור לכאן ואני אמשיך מהנקודה שעצרנו. 👋" }]);
      
      setTimeout(() => {
          router.push("/builder/connect");
      }, 1500);
  }

  function resetAll() {
    if(!confirm("האם אתה בטוח שברצונך לאפס הכל?")) return;
    localStorage.removeItem("flowbot_draft_flow");
    localStorage.removeItem("flowbot_chat_history");
    localStorage.removeItem("flowbot_phase");
    setPersistentScanData(null);
    setMsgs([{ role: "bot", text: "איפסתי הכל. בוא נתחיל מחדש." }]);
    setFlow(null);
    setFlowReady(false);
    setPhase("intro");
    setSimulateMode(false);
    setMobileMenuOpen(false);
  }

  /* =========================================================
   * UI RENDER
   * ======================================================= */

  // קומפוננטת תוכן ה-Sidebar (לשימוש גם בדסקטופ וגם במובייל)
  const SidebarContent = () => (
    <div className="flex flex-col gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-sm">
            <Database size={16} className="text-emerald-500" />
            סטטוס פרויקט
        </div>
        
        {!flow ? (
            <div className="text-center py-6">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={20} className="text-slate-300" />
                </div>
                <p className="text-xs text-slate-400">הבוט בשלבי למידה</p>
            </div>
        ) : (
            <div className="space-y-4">
                <StatusItem label="מטרה" value={flow.goal} />
                <StatusItem label="שלבים" value={`${flow.steps?.length || 0} שלבים`} />
                <div className="pt-2">
                    <button 
                    onClick={() => {
                        setSimulateMode(true);
                        setMobileMenuOpen(false);
                        // גלילה לסימולציה אחרי שנסגר התפריט
                        setTimeout(() => {
                           mainContainerRef.current?.scrollTo({ top: mainContainerRef.current.scrollHeight, behavior: 'smooth' });
                        }, 300);
                    }}
                    className="w-full bg-emerald-50 text-emerald-700 py-2 rounded-lg text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                    >
                    <Play size={12} fill="currentColor" />
                    הפעל סימולציה מחדש
                    </button>
                </div>
            </div>
        )}
        </div>

        <div className="space-y-2">
            <SideButton icon={<GraduationCap size={14}/>} onClick={() => { setShowGuideModal(true); setMobileMenuOpen(false); }}>מדריך</SideButton>
            <SideButton icon={<FileStack size={14}/>} onClick={() => { setShowTemplatesModal(true); setMobileMenuOpen(false); }}>תבניות</SideButton>
        </div>
        
        {flowReady && (
            <div 
                onClick={() => handleConnectRedirect("מעבר לחיבורים")}
                className="mt-4 bg-slate-900 text-white py-3.5 rounded-xl text-center text-sm font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
                המשך לחיבורים
                <ArrowRight size={16} />
            </div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-100 md:hidden">
            <button onClick={resetAll} className="w-full text-rose-500 flex items-center justify-center gap-2 text-sm font-medium py-2">
                <RefreshCcw size={14}/> איפוס מערכת
            </button>
        </div>
    </div>
  );

  return (
    <div className="relative h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden" dir="rtl">
      
      {/* Header */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between bg-white border-b border-slate-200 shrink-0 h-16 z-20 shadow-sm">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100 transition active:bg-slate-200">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-base md:text-lg font-black tracking-tight text-slate-900 leading-tight">FlowBot Builder</h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:block">המנוע החכם לעסקים</p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
           <button onClick={resetAll} className="hidden md:block p-2 text-slate-400 hover:text-rose-500 transition" title="איפוס">
             <RefreshCcw size={18} />
           </button>
           <Link href="/dashboard" className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full text-xs font-bold transition">
             <LayoutGrid size={14} /> דשבורד
           </Link>
           {/* כפתור תפריט למובייל */}
           <button 
             onClick={() => setMobileMenuOpen(true)}
             className="md:hidden p-2 rounded-lg bg-slate-100 text-slate-700"
           >
             <Menu size={20} />
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div 
        ref={mainContainerRef}
        className="flex-1 flex flex-col items-center overflow-y-auto scroll-smooth"
      >
        <div className="w-full max-w-5xl p-2 md:p-8 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4 md:gap-6 pb-20 md:pb-8">
          
          {/* Left Column: Chat & Simulation */}
          <div className="flex flex-col gap-4 md:gap-6">
            
            {/* 1. Builder Chat */}
            <motion.section 
                initial="hidden" animate="show" variants={fade}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[50vh] md:min-h-[400px]"
            >
               {/* Messages List */}
               <div className="flex-1 p-3 md:p-4 space-y-4 md:space-y-5 overflow-y-auto">
                  {msgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "bot" && (
                         <div className="ml-2 mt-1 hidden sm:block"><FlowBotAvatar /></div>
                      )}
                      <div className={`px-4 py-3 max-w-[88%] md:max-w-[85%] text-[15px] md:text-sm leading-relaxed shadow-sm whitespace-pre-wrap
                         ${m.role === "user" 
                           ? "bg-slate-900 text-white rounded-2xl rounded-br-none" 
                           : "bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl rounded-bl-none"
                         }`}>
                         {m.text}
                      </div>
                    </div>
                  ))}
                  
                  {isScanning && (
                    <div className="flex items-center gap-3 text-xs font-bold text-blue-600 bg-blue-50 p-3 rounded-xl w-fit animate-pulse">
                        <Globe size={14} />
                        סורק את האתר...
                        <Loader2 size={12} className="animate-spin" />
                    </div>
                  )}
                  {busy && !isScanning && (
                     <div className="flex items-center gap-1 ml-4 md:ml-12 mt-2">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                     </div>
                  )}
                  <div ref={endRef} />
               </div>

               {/* Input Area */}
               <div className="p-3 md:p-4 bg-white border-t border-slate-100 sticky bottom-0 z-10">
                  <div className="relative">
                     <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                        placeholder="כתוב כאן..."
                        disabled={busy || isScanning}
                        // text-base מונע זום באייפון
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base md:text-sm rounded-xl pl-12 pr-4 py-3 md:py-3.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition disabled:opacity-50"
                     />
                     <button 
                        onClick={sendMsg}
                        disabled={!input.trim() || busy}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition active:scale-95"
                     >
                        <ArrowRight size={16} />
                     </button>
                  </div>
               </div>
            </motion.section>

            {/* 2. Simulation Widget */}
            <AnimatePresence>
               {simulateMode && flow && (
                  <motion.div
                     initial={{ opacity: 0, y: 40 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     transition={{ duration: 0.5, type: "spring" }}
                     className="scroll-mt-4" // לטובת גלילה
                  >
                     <SimulationBox flow={flow} onClose={() => setSimulateMode(false)} />
                  </motion.div>
               )}
            </AnimatePresence>
          </div>

          {/* Right Column (Desktop) */}
          <aside className="hidden md:flex flex-col gap-4">
             <SidebarContent />
          </aside>

        </div>
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet show={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} title="תפריט בונה">
        <SidebarContent />
      </Sheet>

      {/* Guide & Templates Modals */}
      <Sheet show={showGuideModal} onClose={() => setShowGuideModal(false)} title="איך זה עובד?">
         <p className="text-sm text-slate-600 leading-relaxed">
           1. ספר לבוט על העסק שלך (שם, תחום, שעות).<br/>
           2. הבוט יבנה עבורך תסריט שיחה.<br/>
           3. כשהתסריט מוכן, תיפתח סימולציה למטה.<br/>
           4. שחק עם הסימולציה. אם הכל טוב, לחץ על "המשך לחיבורים".
         </p>
      </Sheet>
      
      <Sheet show={showTemplatesModal} onClose={() => setShowTemplatesModal(false)} title="תבניות מהירות">
         <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
            {['מספרה / תורים', 'מרפאה', 'חנות איקומרס', 'נדל"ן / לידים', 'שירות לקוחות', 'הרשמה לאירוע'].map(t => (
               <div 
                 key={t} 
                 className="p-3 border rounded-lg bg-slate-50 text-center hover:bg-slate-100 cursor-pointer active:scale-95 transition"
                 onClick={() => {
                   setInput(`אני רוצה בוט ל${t}`);
                   setShowTemplatesModal(false);
                 }}
               >
                 {t}
               </div>
            ))}
         </div>
      </Sheet>

    </div>
  );
}

/* =========================================================
 * SIMULATION BOX (The "Smart" Local Player)
 * ======================================================= */

type SimChatMsg = { role: "bot" | "user"; text: string };

function SimulationBox({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  const [chat, setChat] = useState<SimChatMsg[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const steps = flow.steps || [];

  useEffect(() => {
    if (steps.length === 0) return;
    setChat([]);
    setVariables({});
    setCurrentStepIndex(0);
    setTimeout(() => playStep(steps[0], 0), 500);
  }, [flow]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, isTyping]);

  const formatText = (text: string) => {
    return text.replace(/\[([a-zA-Z_]+)\]/g, (_, key) => {
      const v = variables[key] || variables[key.toLowerCase()];
      return v || (key === 'name' ? 'לקוח יקר' : `[${key}]`);
    });
  };

  function playStep(step: StepDef, index: number) {
    setIsTyping(true);
    setCurrentStepIndex(index);
    const msgContent = formatText(step.content || step.title || "...");
    
    setTimeout(() => {
      setIsTyping(false);
      setChat((prev) => [...prev, { role: "bot", text: msgContent }]);
    }, 600);
  }

  function findNextSmartStep(currentVars: Record<string, string>, startIndex: number): number {
    for (let i = startIndex + 1; i < steps.length; i++) {
        const step = steps[i];
        if (step.type === 'text') return i;
        if (step.variable) {
            const varName = step.variable as string;
            if (currentVars[varName]) {
                console.log(`Skipping step ${i}, var '${varName}' known.`);
                continue;
            }
            return i;
        }
        return i;
    }
    return -1;
  }

  function handleUserSend() {
    const text = userInput.trim();
    if (!text) return;

    setChat(prev => [...prev, { role: "user", text }]);
    setUserInput("");

    const newVars = { ...variables };
    const extracted = extractEntities(text);
    Object.assign(newVars, extracted);

    const currentStep = steps[currentStepIndex];
    if (currentStep?.variable && !newVars[currentStep.variable]) {
        newVars[currentStep.variable] = text;
    }

    setVariables(newVars);
    const nextIdx = findNextSmartStep(newVars, currentStepIndex);
    if (nextIdx === -1) return;
    playStep(steps[nextIdx], nextIdx);
  }

  return (
    <div className="mt-4 bg-[#efeae2] border border-slate-300 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl w-full mx-auto relative z-10">
       {/* Fake WhatsApp Header */}
       <div className="bg-[#075E54] px-4 py-3 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <BotIcon size={18} />
             </div>
             <div>
                <div className="text-sm font-bold">העסק שלך</div>
                <div className="text-[10px] opacity-80">מחובר כעת (סימולציה)</div>
             </div>
          </div>
          <button onClick={onClose} className="opacity-70 hover:opacity-100 transition p-1"><X size={20}/></button>
       </div>

       {/* Chat Area */}
       <div 
         ref={scrollRef}
         className="h-[350px] md:h-[400px] overflow-y-auto p-4 space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"
       >
          {chat.map((m, i) => (
             <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`px-3 py-2 max-w-[85%] text-[14px] rounded-lg shadow-sm leading-snug break-words relative
                   ${m.role === "user" ? "bg-[#dcf8c6] text-slate-900 rounded-tr-none" : "bg-white text-slate-900 rounded-tl-none"}
                `}>
                   {m.text}
                   <span className="text-[9px] text-slate-400 block text-left mt-1 ml-[-4px]">
                      {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      {m.role === "user" && <span className="ml-1 inline-block text-blue-400">✓✓</span>}
                   </span>
                </div>
             </div>
          ))}
          {isTyping && (
             <div className="flex justify-start">
                <div className="bg-white px-3 py-2 rounded-lg rounded-tl-none shadow-sm flex gap-1 w-fit">
                   <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"/>
                   <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"/>
                   <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"/>
                </div>
             </div>
          )}
       </div>

       {/* Input Area */}
       <div className="bg-[#f0f2f5] p-2 flex gap-2 items-center">
          <input 
             value={userInput}
             onChange={e => setUserInput(e.target.value)}
             onKeyDown={e => e.key === "Enter" && handleUserSend()}
             className="flex-1 bg-white rounded-full px-4 py-2.5 text-base md:text-sm focus:outline-none border-none shadow-sm"
             placeholder="הקלד הודעה לבדיקה..."
          />
          <button 
             onClick={handleUserSend}
             disabled={!userInput.trim()}
             className="w-10 h-10 bg-[#075E54] text-white rounded-full flex items-center justify-center hover:bg-[#054c44] transition disabled:opacity-50 shadow-sm shrink-0"
          >
             <Send size={18} />
          </button>
       </div>
    </div>
  );
}

/* =========================================================
 * SUB COMPONENTS
 * ======================================================= */

function FlowBotAvatar({ typing = false }: { typing?: boolean }) {
  return (
    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shadow-sm shrink-0">
       <BotIcon size={16} className={typing ? "animate-pulse" : ""} />
    </div>
  );
}

function StatusItem({ label, value }: { label: string, value: string }) {
   return (
      <div>
         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{label}</div>
         <div className="text-sm font-semibold text-slate-800 line-clamp-2">{value}</div>
      </div>
   );
}

function SideButton({ icon, children, onClick }: { icon: ReactNode, children: ReactNode, onClick: () => void }) {
   return (
      <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm text-right active:scale-[0.98]">
         <span className="text-slate-400">{icon}</span>
         {children}
      </button>
   );
}

function Sheet({ show, onClose, title, children }: { show: boolean, onClose: () => void, title: string, children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative"
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">{title}</h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
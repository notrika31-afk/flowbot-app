"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion"; // דורש npm install framer-motion

interface StepButton {
  label: string;
  go: string; // ה-ID של השלב הבא
}

interface BotMessage {
  id: string;
  from: "bot" | "user";
  text?: string;
  buttons?: StepButton[];
}

interface SimulatePageProps {
  flow: any; // רצוי להחליף בטיפוס Flow אמיתי כשיש לך
}

export default function Simulation({ flow }: SimulatePageProps) {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ניהול המיקום הנוכחי בגרף כדי שהשרת ידע לאן להתקדם
  const [currentStepId, setCurrentStepId] = useState<string>("start"); 

  const bottomRef = useRef<HTMLDivElement>(null);

  // גלילה אוטומטית למטה
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // אתחול הודעת פתיחה
  useEffect(() => {
    if (flow && messages.length === 0) {
      const startStep = flow.steps?.find((s: any) => s.id === "start");
      if (startStep) {
        setMessages([
          {
            id: crypto.randomUUID(),
            from: "bot",
            text: startStep.content || "היי! איך אפשר לעזור?",
            buttons: startStep.buttons || [],
          },
        ]);
        setCurrentStepId("start");
      }
    }
  }, [flow]);

  async function sendMessage(text: string, payloadStepId: string = currentStepId) {
    if (!text.trim()) return;

    // הוספת הודעת המשתמש למסך
    setMessages((prev) => [
      ...prev, 
      { id: crypto.randomUUID(), from: "user", text }
    ]);
    setInput("");
    setLoading(true);

    try {
      // שליחה לשרת עם המיקום הנוכחי
      const res = await fetch("/api/bot/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text, 
          flow, 
          currentStepId: payloadStepId, // קריטי: שולחים לשרת איפה אנחנו
          sessionId: "demo-session" 
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch bot response");

      const data = await res.json();

      // השהייה מלאכותית לתחושה טבעית
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from: "bot",
            text: data.reply || "סליחה, לא הבנתי.",
            buttons: data.buttons || [],
          },
        ]);

        // עדכון המיקום הנוכחי בגרף בהתאם לתשובת השרת
        if (data.nextStepId) {
          setCurrentStepId(data.nextStepId);
        }
        
        setLoading(false);
      }, 600);

    } catch (error) {
      console.error("Simulation Error:", error);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from: "bot", text: "שגיאה בתקשורת עם הבוט." }
      ]);
    }
  }

  // טיפול בלחיצה על כפתור מהבוט
  const handleButtonClick = (label: string) => {
    sendMessage(label);
  };

  return (
    <div className="flex flex-col h-[650px] w-full max-w-sm mx-auto bg-white rounded-[2.5rem] border-[8px] border-black shadow-2xl overflow-hidden relative">
      
      {/* Notch / Header */}
      <div className="bg-gray-100/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
              FB
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 leading-tight">העסק שלי</h3>
              <p className="text-[10px] text-green-600 font-medium">מחובר כעת</p>
            </div>
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efe7dd] relative scrollbar-hide">
        {/* Background Pattern Hint */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f9640.png')] bg-repeat" />

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onButtonClick={handleButtonClick} />
          ))}
        </AnimatePresence>

        {loading && <TypingBubble />}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          className="flex-1 bg-white border border-gray-300 text-gray-800 text-sm rounded-full px-4 py-3 focus:outline-none focus:border-green-500 transition-colors shadow-sm"
          placeholder="הקלד הודעה..."
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------ */
/* Component: Message Bubble */

function MessageBubble({
  message,
  onButtonClick,
}: {
  message: BotMessage;
  onButtonClick: (label: string) => void;
}) {
  const isBot = message.from === "bot";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex w-full ${isBot ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`relative max-w-[80%] px-4 py-2 rounded-2xl shadow-sm text-sm leading-relaxed ${
          isBot
            ? "bg-white text-gray-800 rounded-tl-none border border-gray-100"
            : "bg-[#d9fdd3] text-gray-900 rounded-tr-none"
        }`}
      >
        <div className="whitespace-pre-line">{message.text}</div>

        {/* Buttons */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-gray-100">
            {message.buttons.map((b, i) => (
              <button
                key={i}
                onClick={() => onButtonClick(b.label)}
                className="text-xs font-medium text-[#008069] bg-green-50 hover:bg-green-100 py-2 px-3 rounded-lg transition-colors text-center w-full"
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Timestamp simulation */}
        <div className={`text-[9px] mt-1 text-right ${isBot ? "text-gray-400" : "text-green-800/60"}`}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------ */
/* Component: Typing Indicator */

function TypingBubble() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white border border-gray-100 shadow-sm inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
      </div>
    </motion.div>
  );
}

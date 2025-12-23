"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  CheckCircle2, 
  Server, 
  Zap, 
  ArrowRight, 
  Share2, 
  ExternalLink, 
  AlertCircle 
} from "lucide-react";

// --- רכיב קונפטי ---
const Confetti = () => {
  const colors = ["#FFC700", "#FF0000", "#2E3192", "#41BBC7"];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{ 
            backgroundColor: colors[i % colors.length],
            top: "-10%",
            left: `${Math.random() * 100}%`,
          }}
          animate={{ 
            top: "110%",
            rotate: 360,
            x: Math.random() * 100 - 50 
          }}
          transition={{ 
            duration: 2 + Math.random() * 3, 
            repeat: Infinity, 
            delay: Math.random() * 2 
          }}
        />
      ))}
    </div>
  );
};

export default function PublishPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"deploying" | "success" | "error">("deploying");
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState(""); // להציג שגיאה אמיתית אם יש
  
  const deploymentSteps = [
    { text: "יוצר קשר עם השרת...", icon: <Server size={18} /> },
    { text: "מאמת חיבור WhatsApp...", icon: <Zap size={18} /> },
    { text: "שומר ומפרסם את הבוט...", icon: <Loader2 size={18} className="animate-spin" /> },
  ];

  useEffect(() => {
    const publishBot = async () => {
      try {
        // שלב 1: התחלה ויזואלית
        setCurrentStep(0);
        await new Promise(r => setTimeout(r, 1000)); // השהייה קטנה לאפקט

        // שלב 2: שליפת המידע מהאחסון המקומי
        // הערה: וודא שבקומפוננטת ה-Builder אתה שומר את ה-Flow ב-localStorage לפני המעבר לעמוד הזה
        const flowDataString = localStorage.getItem("pending_flow_data") || "{}"; 
        const flowData = JSON.parse(flowDataString);

        setCurrentStep(1); // עדכון ויזואלי

        // שלב 3: קריאה אמיתית ל-API
        const response = await fetch("/api/bot/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flow: flowData,
            // אנחנו לא שולחים waba ידנית כי אנחנו סומכים על החיבור לפייסבוק שכבר קיים ב-DB
            status: "ACTIVE"
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to publish bot");
        }

        // הצלחה!
        setCurrentStep(2);
        await new Promise(r => setTimeout(r, 800)); // רגע של מתח...
        setStatus("success");
        
        // ניקוי נתונים זמניים
        localStorage.removeItem("pending_flow_data");

      } catch (err: any) {
        console.error("Publish Error:", err);
        setErrorMessage(err.message || "שגיאה בפרסום הבוט");
        setStatus("error");
      }
    };

    publishBot();
  }, []);

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 relative" dir="rtl">
      
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-10"
      >
        <AnimatePresence mode="wait">
          
          {/* --- מצב 1: טעינה והתקנה --- */}
          {status === "deploying" && (
            <motion.div
              key="deploying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 md:p-10 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Loader2 size={32} className="animate-spin text-neutral-400" />
              </div>
              
              <h2 className="text-xl md:text-2xl font-black text-neutral-900 mb-2">מכין את הבוט שלך...</h2>
              <p className="text-sm md:text-base text-neutral-500 font-medium mb-8 max-w-xs md:max-w-none">
                אנחנו מחברים את המערכת לשרתי Meta ומעלים את המוח של ה-AI לאוויר.
              </p>

              <div className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-xl p-4 space-y-4 text-right">
                {deploymentSteps.map((step, index) => {
                  const isCompleted = currentStep > index;
                  const isCurrent = currentStep === index;

                  return (
                    <div key={index} className="flex items-center gap-3 transition-all duration-500">
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors shrink-0
                        ${isCompleted ? "bg-green-500 border-green-500 text-white" : 
                          isCurrent ? "border-black text-black bg-white" : "border-neutral-200 text-neutral-200"}
                      `}>
                        {isCompleted ? <CheckCircle2 size={14} /> : (isCurrent ? step.icon : <div className="w-2 h-2 bg-neutral-200 rounded-full" />)}
                      </div>
                      <span className={`
                        font-medium text-sm transition-colors
                        ${isCompleted ? "text-neutral-400 line-through" : isCurrent ? "text-black font-bold" : "text-neutral-300"}
                      `}>
                        {step.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* --- מצב 2: הצלחה --- */}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative p-6 md:p-10 flex flex-col items-center text-center"
            >
              <Confetti />
              
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#25D366] rounded-full flex items-center justify-center mb-6 shadow-lg relative z-10 border-4 border-white">
                <CheckCircle2 size={40} className="text-white md:w-12 md:h-12" strokeWidth={3} />
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-neutral-900 mb-2 relative z-10">
                הבוט באוויר! 🚀
              </h2>
              <p className="text-sm md:text-base text-neutral-500 font-medium mb-8 max-w-sm relative z-10">
                כל הכבוד! הבוט מחובר, פעיל ומוכן לשוחח עם הלקוחות שלך.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full relative z-10">
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full sm:flex-1 py-3.5 bg-white border-2 border-neutral-200 text-black font-bold rounded-xl hover:bg-neutral-50 transition active:scale-95"
                  >
                    לדשבורד הניהול
                  </button>
                  {/* כאן אפשר להוסיף קישור דינמי אם ה-API מחזיר מספר טלפון */}
                  <button 
                    className="w-full sm:flex-1 py-3.5 bg-black text-white font-bold rounded-xl border-2 border-black hover:bg-neutral-800 transition active:scale-95"
                  >
                    סיום
                  </button>
              </div>
            </motion.div>
          )}

          {/* --- מצב 3: שגיאה --- */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 md:p-10 flex flex-col items-center text-center"
            >
               <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600 border-2 border-red-200">
                 <AlertCircle size={32} className="md:w-10 md:h-10" />
               </div>
               <h2 className="text-xl md:text-2xl font-black text-neutral-900 mb-2">משהו השתבש</h2>
               <p className="text-sm md:text-base text-neutral-500 font-medium mb-8">
                 {errorMessage || "לא הצלחנו להתחבר לשרת. אנא נסה שוב."}
               </p>
               <button 
                 onClick={() => window.location.reload()}
                 className="w-full py-3.5 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition"
               >
                 נסה שוב <ArrowRight size={18}/>
               </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
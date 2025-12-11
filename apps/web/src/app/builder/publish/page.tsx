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

// --- רכיב קונפטי פשוט (CSS/Motion) לאווירה ---
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

// --- עמוד ה-Publish ---

export default function PublishPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"deploying" | "success" | "error">("deploying");
  const [currentStep, setCurrentStep] = useState(0);
  
  // שלבי ההתקנה שמוצגים למשתמש בזמן הטעינה
  const deploymentSteps = [
    { text: "מאמת פרטי Meta API...", icon: <Server size={18} /> },
    { text: "מגדיר Webhook ומספרי טלפון...", icon: <Zap size={18} /> },
    { text: "מסנכרן תבניות AI...", icon: <Loader2 size={18} className="animate-spin" /> },
  ];

  useEffect(() => {
    // 1. שליפת הנתונים (במציאות נשלח אותם לשרת)
    const storedCreds = sessionStorage.getItem("temp_bot_creds");
    
    if (!storedCreds) {
      // אם אין נתונים, נחזיר אותו אחורה (הגנה)
      // setStatus("error"); 
      // return;
    }

    // 2. סימולציה של תהליך ה-Deployment (במקום קריאת API אמיתית)
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);

      if (step >= deploymentSteps.length) {
        clearInterval(interval);
        setStatus("success");
      }
    }, 1500); // כל שלב לוקח 1.5 שניות

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-full flex items-center justify-center p-4 relative">
      
      {/* כרטיס הפעולה המרכזי */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white border-[3px] border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-10"
      >
        <AnimatePresence mode="wait">
          
          {/* --- מצב 1: טעינה והתקנה --- */}
          {status === "deploying" && (
            <motion.div
              key="deploying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-10 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Loader2 size={32} className="animate-spin text-neutral-400" />
              </div>
              
              <h2 className="text-2xl font-black text-neutral-900 mb-2">מכין את הבוט שלך...</h2>
              <p className="text-neutral-500 font-medium mb-8">
                אנחנו מחברים את המערכת לשרתי Meta ומעלים את המוח של ה-AI לאוויר.
              </p>

              <div className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-xl p-4 space-y-4 text-right">
                {deploymentSteps.map((step, index) => {
                  const isCompleted = currentStep > index;
                  const isCurrent = currentStep === index;

                  return (
                    <div key={index} className="flex items-center gap-3 transition-all duration-500">
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors
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

          {/* --- מצב 2: הצלחה (חגיגה) --- */}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative p-10 flex flex-col items-center text-center"
            >
              <Confetti /> {/* קונפטי ברקע */}
              
              <div className="w-24 h-24 bg-[#25D366] rounded-full flex items-center justify-center mb-6 shadow-lg relative z-10 border-4 border-white">
                <CheckCircle2 size={48} className="text-white" strokeWidth={3} />
              </div>

              <h2 className="text-3xl font-black text-neutral-900 mb-2 relative z-10">
                הבוט באוויר! 🚀
              </h2>
              <p className="text-neutral-500 font-medium mb-8 max-w-sm relative z-10">
                כל הכבוד! הבוט מחובר, פעיל ומוכן לשוחח עם הלקוחות שלך.
              </p>

              {/* קישור לבוט */}
              <div className="w-full bg-neutral-900 text-white p-4 rounded-xl flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <Share2 size={20} />
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">קישור ישיר לבוט</div>
                        <div className="font-mono text-sm">wa.me/972501234567</div>
                    </div>
                </div>
                <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <ExternalLink size={18} />
                </button>
              </div>

              <div className="flex gap-3 w-full relative z-10">
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="flow-btn w-full bg-white text-black hover:bg-neutral-100 flex-1"
                  >
                    לדשבורד הניהול
                  </button>
                  <button 
                    onClick={() => window.open('https://wa.me/972501234567', '_blank')}
                    className="flow-btn w-full flex-1 bg-black text-white border-black hover:bg-neutral-800"
                  >
                    בדוק בווטסאפ
                  </button>
              </div>
            </motion.div>
          )}

          {/* --- מצב 3: שגיאה (Fallback) --- */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-10 flex flex-col items-center text-center"
            >
               <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600 border-2 border-red-200">
                 <AlertCircle size={40} />
               </div>
               <h2 className="text-2xl font-black text-neutral-900 mb-2">משהו השתבש</h2>
               <p className="text-neutral-500 font-medium mb-8">
                 לא הצלחנו להתחבר לשרתי Meta. ייתכן שהטוקן פג תוקף או שהנתונים אינם תואמים.
               </p>
               <button 
                 onClick={() => router.push('/builder/whatsapp')}
                 className="flow-btn w-full flex items-center justify-center gap-2"
               >
                 חזור להגדרות חיבור <ArrowRight size={18}/>
               </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      {/* טקסט עזרה למטה */}
      {status === "success" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 text-neutral-400 text-xs font-medium"
          >
            ניתן לשנות את ההגדרות בכל זמן דרך לוח הבקרה
          </motion.div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Info,
  ExternalLink,
  Settings,
  UserCheck,
  Lock
} from "lucide-react";

// --- הגדרות ולידציה ---
const MIN_ID_LENGTH = 10; 
const MIN_TOKEN_LENGTH = 50; 

export default function WhatsappConnectionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // נתוני הטופס
  const [formData, setFormData] = useState({
    phoneId: "",
    wabaId: "",
    token: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSaveAndPublish = async () => {
    setError(null);

    // 1. ולידציה בסיסית
    if (!formData.phoneId || !formData.wabaId || !formData.token) {
      setError("נא למלא את כל השדות הנדרשים.");
      return;
    }
    if (formData.phoneId.length < MIN_ID_LENGTH) {
      setError(`Phone Number ID קצר מדי.`);
      return;
    }
    if (formData.token.length < MIN_TOKEN_LENGTH) {
      setError(`Permanent Token קצר מדי.`);
      return;
    }
    
    setIsLoading(true);

    try {
      // 2. שליפת הבוט מהדפדפן (כדי לפרסם אותו)
      const localFlow = localStorage.getItem('flowbot_draft_flow');
      if (!localFlow) {
          throw new Error("לא נמצא בוט שמור בזיכרון. נא לחזור לבילדר.");
      }

      // 3. קריאה לשרת: גם שומרת את ה-WABA וגם מפרסמת את הבוט (Publish)
      // הערה: אני מניח שיש לך API מאוחד או שנבצע שתי קריאות. 
      // כאן נבצע קריאה אחת חכמה ששומרת הכל ומפעילה את הבוט.
      const res = await fetch('/api/bot/publish', { // שיניתי את ה-Endpoint ל-publish
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              flow: JSON.parse(localFlow),
              waba: formData,
              status: 'ACTIVE' // מפעילים אותו מיד
          }),
      });

      // טיפול במשתמש לא מחובר
      if (res.status === 401) {
          localStorage.setItem('pending_waba_save', JSON.stringify(formData));
          router.push('/register?callbackUrl=/builder/whatsapp');
          return;
      }

      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "שגיאה בפרסום הבוט.");
      }

      // 4. הצלחה! ניקוי זכרון ומעבר לחגיגה
      localStorage.removeItem('flowbot_draft_flow');
      localStorage.removeItem('pending_waba_save');
      
      // שומרים ב-Session שהפרסום הצליח כדי שעמוד ה-Publish ידע להציג הצלחה
      sessionStorage.setItem("bot_published_success", "true");
      
      // מעבר לעמוד ה-Publish (שיראה את ה-V הירוק והקונפטי)
      router.push("/builder/publish"); 

    } catch (error: any) {
      console.error("Publish Error:", error);
      setError(error.message || "אירעה שגיאה בחיבור. בדוק את הטוקן ונסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  // שחזור נתונים (אם חזרנו מהרשמה)
  useEffect(() => {
      const savedWaba = localStorage.getItem('pending_waba_save');
      if (savedWaba) {
          try {
              setFormData(JSON.parse(savedWaba));
          } catch (e) {}
      }
  }, []);

  return (
    <div className="w-full min-h-[90vh] flex items-center justify-center p-6 lg:p-12 overflow-hidden" dir="rtl">
      
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center relative">
        
        {/* --- רקע דקורטיבי --- */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-green-200/30 rounded-full blur-3xl -z-10 mix-blend-multiply animate-pulse" />

        {/* --- צד ימין: טקסטים --- */}
        <div className="lg:col-span-7 flex flex-col gap-8 text-right order-last lg:order-first">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-neutral-100 rounded-full shadow-sm mb-6">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                     <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">שלב אחרון</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-neutral-900 mb-6 leading-[0.95]">
                    לחבר ולהפעיל <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#25D366] to-[#128C7E]">
                        את הבוט שלך.
                    </span>
                </h1>
                
                <p className="text-xl text-neutral-500 font-medium leading-relaxed max-w-xl ml-auto">
                    הזינו את פרטי ה-API של Meta.
                    <br/>
                    ברגע שתלחצו על הכפתור, הבוט יעלה לאוויר ויהיה זמין ללקוחות שלכם מיד.
                </p>
            </motion.div>

            <HowToConnectSection />
        </div>

        {/* --- צד שמאל: הטופס --- */}
        <motion.div 
            className="lg:col-span-5 w-full relative"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
            <div className="absolute -inset-3 bg-neutral-900 rounded-[2.5rem] rotate-2 opacity-5 -z-10" />
            
            <div className="bg-white rounded-[2rem] border-[4px] border-neutral-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 lg:p-10 flex flex-col gap-6 relative overflow-hidden">
                
                <div className="flex items-center justify-between pb-6 border-b-2 border-neutral-100">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-neutral-900">פרטי גישה</h2>
                        <p className="text-sm text-neutral-400 font-medium">מתוך Meta Developers</p>
                    </div>
                    <div className="w-12 h-12 bg-[#F5F5F5] rounded-2xl border-2 border-neutral-200 flex items-center justify-center">
                        <Lock size={20} className="text-neutral-400" />
                    </div>
                </div>

                <div className="space-y-5">
                    <InputGroup 
                        label="Phone Number ID" 
                        name="phoneId" 
                        value={formData.phoneId} 
                        onChange={handleChange}
                        placeholder="10594..." 
                    />
                    <InputGroup 
                        label="WABA ID" 
                        name="wabaId" 
                        value={formData.wabaId} 
                        onChange={handleChange}
                        placeholder="10234..." 
                    />
                    <InputGroup 
                        label="Permanent Token" 
                        name="token" 
                        value={formData.token} 
                        onChange={handleChange}
                        placeholder="EAAG..." 
                        type="password"
                        isToken
                    />
                </div>
                
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-300 rounded-xl text-sm font-medium text-red-700 text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <button
                    onClick={handleSaveAndPublish}
                    disabled={isLoading}
                    className={`
                        group mt-4 w-full py-4 bg-neutral-900 text-white rounded-xl font-bold text-lg 
                        border-[3px] border-transparent hover:border-neutral-900 hover:bg-white hover:text-neutral-900
                        transition-all duration-200 flex items-center justify-center gap-3
                        ${isLoading ? "opacity-80 cursor-wait" : "shadow-lg active:translate-y-1"}
                    `}
                >
                    {isLoading ? (
                        "מפעיל את הבוט..."
                    ) : (
                        <>
                            <span>הפעל בוט עכשיו</span>
                            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
                        </>
                    )}
                </button>
                
                <div className="text-center">
                    <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-neutral-400 hover:text-neutral-900 underline decoration-neutral-200 underline-offset-4 flex items-center justify-center gap-1">
                        איפה מוצאים את הנתונים?
                        <ExternalLink size={12} />
                    </a>
                </div>

            </div>
        </motion.div>

      </div>
    </div>
  );
}

// --- רכיבי עזר (ללא שינוי) ---

function HowToConnectSection() {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-6"
        >
             <h2 className="text-2xl font-black text-neutral-900 border-b border-neutral-200 pb-2">
                איך מתחברים?
            </h2>
            <StepCard 
                num={1}
                icon={<Settings className="text-blue-500" />}
                title="הגדרת אפליקציית Meta"
                desc="בפורטל המפתחים של Meta, צרו אפליקציה והוסיפו את מוצר WhatsApp."
            />
            <StepCard 
                num={2}
                icon={<UserCheck className="text-purple-500" />}
                title="העתקת פרטים"
                desc="העתיקו את ה-Phone ID, WABA ID והטוקן מהדשבורד והדביקו כאן."
            />
            <StepCard 
                num={3}
                icon={<ShieldCheck className="text-green-500" />}
                title="שיגור"
                desc="לחצו על הכפתור, והמערכת תאמת את החיבור ותעלה את הבוט לאוויר מיד."
            />
        </motion.div>
    );
}

function StepCard({ num, icon, title, desc }: { num: number, icon: React.ReactNode, title: string, desc: string }) {
    return (
        <motion.div 
            className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-neutral-200 shadow-md"
            whileHover={{ scale: 1.01 }}
        >
            <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-black text-lg shadow-lg">
                    {num}
                </div>
            </div>
            <div>
                <h3 className="font-bold text-xl text-neutral-900 flex items-center gap-2 mb-1">{icon} {title}</h3>
                <p className="text-base text-neutral-600 font-medium leading-relaxed">{desc}</p>
            </div>
        </motion.div>
    );
}

function InputGroup({ label, name, value, onChange, placeholder, type = "text", isToken = false }: any) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1">{label}</label>
            <div className="relative">
                <input 
                    name={name}
                    value={value}
                    onChange={onChange}
                    type={type}
                    dir="ltr"
                    placeholder={placeholder}
                    className={`w-full bg-neutral-50 border-2 border-neutral-200 rounded-xl px-4 py-3.5 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all font-mono text-sm placeholder:text-neutral-300 text-neutral-900 ${isToken ? "tracking-widest" : ""}`}
                />
            </div>
        </div>
    );
}
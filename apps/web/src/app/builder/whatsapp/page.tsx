"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Facebook, 
  CheckCircle2,
  Loader2,
  Zap,
  MousePointerClick,
  CheckSquare,
  AlertCircle,
  RefreshCw // הוספתי אייקון לכפתור רענון
} from "lucide-react";

export default function WhatsappConnectionPage() {
  const router = useRouter();
  
  // ניהול מצבים
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualCheck, setShowManualCheck] = useState(false); // מצב לכפתור החילוץ

  // ניקוי שאריות בכניסה לדף
  useEffect(() => {
      localStorage.removeItem('fb_auth_result');
  }, []);

  // --- מנגנון 1: האזנה להודעות (PostMessage) ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FACEBOOK_AUTH_RESULT') {
          if (event.data.status === 'SUCCESS') {
              handleAutoPublish();
          } else {
              setStatus('ERROR');
              setErrorMessage(event.data.message || "החיבור נכשל.");
          }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // --- מנגנון 2: זיהוי חזרה לחלון (Focus) ---
  useEffect(() => {
    const onFocus = () => {
        // אם המשתמש חזר לחלון והסטטוס עדיין "מתחבר", נבדוק אם סיים
        if (status === 'CONNECTING') {
            handleAutoPublish();
        }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [status]);

  // פונקציה 1: פתיחת חלון פייסבוק (Popup)
  const handleConnectFacebook = () => {
    setStatus('CONNECTING');
    setErrorMessage(null);
    setShowManualCheck(false);

    // הצגת כפתור חילוץ אם לוקח יותר מדי זמן
    setTimeout(() => setShowManualCheck(true), 5000);

    // ניקוי לפני התחלה
    localStorage.removeItem('fb_auth_result');

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const callbackUrl = `${window.location.origin}/api/integrations/whatsapp/callback`; 

    if (!appId) {
        setStatus('ERROR');
        setErrorMessage("שגיאת מערכת: חסר מזהה אפליקציה (App ID).");
        return;
    }

    const targetUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${callbackUrl}&scope=whatsapp_business_management,whatsapp_business_messaging,email,public_profile&response_type=code`;
    
    const width = 600;
    const height = 700;
    const left = typeof window !== 'undefined' ? (window.screen.width / 2) - (width / 2) : 0;
    const top = typeof window !== 'undefined' ? (window.screen.height / 2) - (height / 2) : 0;

    const popup = window.open(
        targetUrl, 
        'FacebookLogin', 
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
    );

    // --- המנגנון החדש: בדיקה מחזורית (Polling) ---
    const checkInterval = setInterval(() => {
        // 1. בדיקה בתיבת הדואר (LocalStorage) - הדרך הכי אמינה
        const storedResult = localStorage.getItem('fb_auth_result');
        if (storedResult) {
            clearInterval(checkInterval);
            if (popup && !popup.closed) popup.close(); // סגירה יזומה
            
            const result = JSON.parse(storedResult);
            if (result.status === 'SUCCESS') {
                handleAutoPublish();
            } else {
                setStatus('ERROR');
                setErrorMessage(result.message || "שגיאה בהתחברות");
            }
            return;
        }

        // 2. בדיקה אם החלון נסגר (Fallback)
        if (popup && popup.closed) {
            clearInterval(checkInterval);
            // אם החלון נסגר, ניתן לשרת רגע לעכל ואז ננסה להתקדם
            setTimeout(() => {
                if (status === 'CONNECTING') {
                    handleAutoPublish(); 
                }
            }, 1000);
        }
    }, 1000);
  };

  // פונקציה 2: הפעלת הבוט לאחר החיבור
  const handleAutoPublish = async () => {
    // מניעת כפילויות
    if (status === 'SUCCESS' || status === 'PROCESSING') return;

    setStatus('PROCESSING');

    try {
      const localFlow = localStorage.getItem('flowbot_draft_flow');
      
      // בדיקת חיבור מול השרת
      const res = await fetch('/api/bot/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              flow: localFlow ? JSON.parse(localFlow) : null,
              status: 'ACTIVE' 
          }),
      });

      if (!res.ok) {
          throw new Error("נראה שהחיבור לפייסבוק לא הושלם בשרת.");
      }

      setStatus('SUCCESS');
      localStorage.removeItem('flowbot_draft_flow');
      sessionStorage.setItem("bot_published_success", "true");
      
      setTimeout(() => {
          router.push("/builder/publish"); 
      }, 1500);

    } catch (error: any) {
      console.error("Publish Error:", error);
      // אם נכשלנו, נחזור למצב שגיאה כדי שהמשתמש ינסה שוב
      setStatus('ERROR');
      setErrorMessage("החיבור לא זוהה. אנא נסה שוב.");
    }
  };

  return (
    <div className="w-full min-h-[90vh] flex items-center justify-center p-4 md:p-6 overflow-x-hidden bg-neutral-50/50" dir="rtl">
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center relative">
        
        {/* אלמנט רקע דקורטיבי */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] -z-10" />

        {/* --- צד ימין: הסבר ומדריך --- */}
        <div className="flex flex-col gap-6 order-2 lg:order-1 text-right">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700 font-bold text-xs mb-6">
                    <Zap size={14} fill="currentColor" />
                    התקנה מהירה ב-30 שניות
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black text-neutral-900 mb-4 leading-tight">
                    מה קורה בחלון <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-blue-400">
                        שיפתח עכשיו?
                    </span>
                </h1>
                
                <p className="text-lg text-neutral-500 leading-relaxed max-w-lg mb-6">
                    התהליך הוא אוטומטי ובטוח. יפתח חלון קטן של פייסבוק בו תתבקשו לאשר את החיבור.
                </p>
            </motion.div>

            {/* רשימת הנחיות ברורה */}
            <div className="space-y-4">
                <GuideItem 
                    icon={<MousePointerClick className="text-purple-500"/>} 
                    title="בחירת העסק" 
                    desc="תתבקשו לבחור את חשבון ה-Meta Business אליו שייך המספר." 
                />
                <GuideItem 
                    icon={<CheckSquare className="text-green-500"/>} 
                    title="בחירת מספר טלפון" 
                    desc="בחרו את המספר ממנו הבוט ישלח ויקבל הודעות." 
                />
                
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start mt-2">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <span className="block font-bold text-neutral-800 text-sm mb-1">הכי חשוב: הרשאות</span>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            בשלב האישור, <span className="font-bold underline decoration-amber-300 decoration-2">אל תורידו את הסימון</span> מהרשאות שפייסבוק מבקש.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* --- צד שמאל: כרטיס הפעולה --- */}
        <motion.div 
            className="w-full relative order-1 lg:order-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
        >
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl shadow-neutral-200/40 p-8 md:p-10 flex flex-col items-center text-center relative overflow-hidden">
                
                {status === 'SUCCESS' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-8"
                    >
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-neutral-900 mb-2">הכל מוכן!</h3>
                        <p className="text-neutral-500">הבוט מחובר ומפורסם בהצלחה.</p>
                        <p className="text-sm text-neutral-400 mt-4">מעביר אותך לדשבורד...</p>
                    </motion.div>
                )}

                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 relative group">
                    <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Facebook size={40} fill="currentColor" className="relative z-10" />
                </div>

                <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                    {status === 'PROCESSING' ? 'מגדיר את הבוט...' : 'חיבור ל-WhatsApp'}
                </h2>
                
                <p className="text-neutral-500 text-sm mb-8 px-4">
                    {status === 'PROCESSING' 
                        ? 'אנא המתן, המערכת מסיימת את ההגדרות.'
                        : 'לחצו על הכפתור כדי לפתוח את חלון האישור המאובטח.'}
                </p>

                {errorMessage && (
                    <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 w-full font-medium">
                        {errorMessage}
                    </div>
                )}

                <button
                    onClick={handleConnectFacebook}
                    disabled={status === 'CONNECTING' || status === 'PROCESSING'}
                    className={`
                        w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                        ${status === 'CONNECTING' || status === 'PROCESSING'
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            : "bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
                        }
                    `}
                >
                    {status === 'CONNECTING' ? (
                        <>
                            <Loader2 className="animate-spin" />
                            <span>פותח חלון...</span>
                        </>
                    ) : status === 'PROCESSING' ? (
                         <>
                            <Loader2 className="animate-spin" />
                            <span>מסיים הגדרות...</span>
                        </>
                    ) : (
                        <>
                            <Facebook fill="currentColor" size={22} />
                            <span>התחברות עם Facebook</span>
                        </>
                    )}
                </button>

                {/* כפתור חילוץ: מופיע רק אם המשתמש נתקע במצב "מתחבר" למשך 5 שניות */}
                {showManualCheck && status === 'CONNECTING' && (
                    <button 
                        onClick={() => handleAutoPublish()}
                        className="mt-6 text-sm text-blue-600 underline flex items-center justify-center gap-2 mx-auto hover:text-blue-800 transition-colors"
                    >
                        <RefreshCw size={14} />
                        החלון נסגר אבל האתר נתקע? לחץ כאן לבדיקה ידנית
                    </button>
                )}

                <p className="mt-6 text-xs text-neutral-400 max-w-xs mx-auto">
                    בכפוף לתנאי השימוש של Meta ו-WhatsApp Business API.
                </p>

            </div>
        </motion.div>

      </div>
    </div>
  );
}

function GuideItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-neutral-100 shadow-sm hover:border-blue-100 transition-colors">
            <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-neutral-50 rounded-lg">
                {icon}
            </div>
            <div>
                <span className="block text-base font-bold text-neutral-800 mb-0.5">{title}</span>
                <span className="text-sm text-neutral-500 leading-snug block">{desc}</span>
            </div>
        </div>
    );
}
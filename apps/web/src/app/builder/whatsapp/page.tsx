"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Facebook, 
  CheckCircle2,
  Loader2,
  Zap,
  MessageSquare
} from "lucide-react";

export default function WhatsappConnectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ניהול מצבים לחוויית משתמש עשירה
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. בדיקה אם חזרנו מפייסבוק בהצלחה
  useEffect(() => {
    const success = searchParams?.get("success");
    const error = searchParams?.get("error");

    if (success === "true") {
      // חזרנו עם אישור -> מתחילים תהליך פרסום
      handleAutoPublish();
    } else if (error) {
      setStatus('ERROR');
      setErrorMessage("החיבור בוטל או נכשל מצד פייסבוק.");
    }
  }, [searchParams]);

  // פונקציה 1: שליחה לפייסבוק
  const handleConnectFacebook = () => {
    setStatus('CONNECTING');
    setErrorMessage(null);

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    
    // וודא שהכתובת הזו מוגדרת בדיוק ככה ב-Valid OAuth Redirect URIs בפייסבוק
    const callbackUrl = `${window.location.origin}/api/auth/facebook/callback`; 

    if (!appId) {
        setStatus('ERROR');
        setErrorMessage("שגיאת מערכת: חסר מזהה אפליקציה (App ID).");
        return;
    }

    // הפניה לדיאלוג של פייסבוק
    // scope: ההרשאות שאנחנו מבקשים
    const targetUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${callbackUrl}&scope=whatsapp_business_management,whatsapp_business_messaging&response_type=code`;
    
    window.location.href = targetUrl;
  };

  // פונקציה 2: הפעלת הבוט לאחר החיבור
  const handleAutoPublish = async () => {
    setStatus('PROCESSING');

    try {
      const localFlow = localStorage.getItem('flowbot_draft_flow');
      if (!localFlow) {
          throw new Error("לא נמצא בוט שמור בזיכרון. נא לחזור לבילדר.");
      }

      // קריאה לשרת לפרסום הבוט
      // השרת יזהה שיש למשתמש כבר טוקן שמור (מהשלב הקודם) וישתמש בו
      const res = await fetch('/api/bot/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              flow: JSON.parse(localFlow),
              status: 'ACTIVE' 
          }),
      });

      if (!res.ok) {
          throw new Error("שגיאה בפרסום הבוט.");
      }

      // הצלחה מלאה
      setStatus('SUCCESS');
      localStorage.removeItem('flowbot_draft_flow');
      sessionStorage.setItem("bot_published_success", "true");
      
      // מעבר לעמוד הבא אחרי 2 שניות
      setTimeout(() => {
          router.push("/builder/publish"); 
      }, 2000);

    } catch (error: any) {
      console.error("Publish Error:", error);
      setStatus('ERROR');
      setErrorMessage("החיבור הצליח, אך הפעלת הבוט נכשלה. נסה שוב.");
    }
  };

  return (
    <div className="w-full min-h-[90vh] flex items-center justify-center p-4 md:p-6 overflow-x-hidden bg-neutral-50/50" dir="rtl">
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center relative">
        
        {/* אלמנט רקע דקורטיבי */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] -z-10" />

        {/* --- צד ימין: הסבר ומכירה --- */}
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
                    לחבר את הבוט <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-blue-400">
                        בלי להסתבך.
                    </span>
                </h1>
                
                <p className="text-lg text-neutral-500 leading-relaxed max-w-lg">
                    הקמנו תהליך אוטומטי חכם. 
                    במקום להעתיק קודים ולהתעסק עם הגדרות טכניות, פשוט התחברו לחשבון הפייסבוק העסקי שלכם – ואנחנו נעשה את השאר.
                </p>
            </motion.div>

            <div className="space-y-4 pt-4 border-t border-neutral-200/60">
                <FeatureItem icon={<ShieldCheck className="text-green-500"/>} text="חיבור רשמי ומאובטח ל-Meta (WhatsApp API)" />
                <FeatureItem icon={<Zap className="text-amber-500"/>} text="זיהוי אוטומטי של מספר הטלפון העסקי" />
                <FeatureItem icon={<MessageSquare className="text-purple-500"/>} text="הבוט מתחיל לענות מיד בסיום החיבור" />
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
                
                {/* מצב הצלחה */}
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

                {/* אייקון ראשי */}
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 relative group">
                    <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Facebook size={40} fill="currentColor" className="relative z-10" />
                </div>

                <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                    {status === 'PROCESSING' ? 'מגדיר את הבוט...' : 'חיבור ל-WhatsApp'}
                </h2>
                
                <p className="text-neutral-500 text-sm mb-8 px-4">
                    {status === 'PROCESSING' 
                        ? 'אנא המתן, אנחנו שומרים את ההגדרות ומעלים את הבוט לאוויר.'
                        : 'בלחיצה על הכפתור תועבר לאישור מהיר מול פייסבוק.'}
                </p>

                {/* הודעת שגיאה */}
                {errorMessage && (
                    <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 w-full font-medium">
                        {errorMessage}
                    </div>
                )}

                {/* הכפתור הראשי */}
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
                            <span>מתחבר...</span>
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

                <p className="mt-6 text-xs text-neutral-400 max-w-xs mx-auto">
                    בכפוף לתנאי השימוש של Meta ו-WhatsApp Business API.
                </p>

            </div>
        </motion.div>

      </div>
    </div>
  );
}

// קומפוננטה קטנה לשורות היתרונות
function FeatureItem({ icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-100 shadow-sm">
            <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-neutral-50 rounded-lg">
                {icon}
            </div>
            <span className="text-sm font-bold text-neutral-700">{text}</span>
        </div>
    );
}
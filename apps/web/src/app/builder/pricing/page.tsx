// app/builder/billing/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Star, Rocket, Shield, ArrowRight, Loader2, Info, Clock } from "lucide-react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);

  // אסטרטגיית ה-99 ש"ח - מחיר אחיד וברור
  const LAUNCH_PRICE = 99;
  const FUTURE_PRICE = 199;
  
  // המחיר המוצג הוא תמיד 99, הטוגל רק משנה את ההתחייבות/הטבה
  const currentPrice = LAUNCH_PRICE;

  const handleSelectPlan = async () => {
    setLoading(true);
    // 🎯 תיקון הקישור: מעבר ל-checkout במקום payment
    setTimeout(() => {
      window.location.href = "/builder/checkout"; 
    }, 1500);
  };

  return (
    <main 
      className="min-h-screen w-full font-sans text-slate-900 overflow-x-hidden selection:bg-indigo-100" 
      // תיקון רקע: גרדיאנט מלא שנגלל עם העמוד
      style={{
        background: `
          radial-gradient(at 100% 0%, #eff6ff 0px, transparent 50%), 
          radial-gradient(at 0% 100%, #f5f3ff 0px, transparent 50%), 
          #fafafa
        `
      }}
      dir="rtl"
    >
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-16">
        
        {/* Header ניווט */}
        <div className="mb-10 flex justify-between items-center">
            <Link 
                href="/builder/connect" 
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-slate-200/60 shadow-sm"
            >
                <ArrowRight size={16} className="rotate-180" />
                חזרה
            </Link>
            
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50/90 backdrop-blur px-3 py-1.5 rounded-full border border-amber-100/60 shadow-sm animate-pulse">
                <Clock size={12} />
                מחירי השקה לזמן מוגבל
            </div>
        </div>

        {/* כותרת ראשית חזקה */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] drop-shadow-sm">
            עובד מצטיין לעסק שלך <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                במחיר של ארוחת צהריים.
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            במקום לשלם אלפי שקלים לסוכנויות, קבל את הטכנולוגיה הכי מתקדמת 
            במחיר נגיש וקבוע. ללא אותיות קטנות.
          </p>
        </div>

        {/* הבחירה (חודשי/שנתי) */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm flex items-center relative">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all z-10 relative ${
                billingCycle === "monthly" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              חודשי
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all z-10 relative flex items-center gap-2 ${
                billingCycle === "yearly" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              שנתי
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold shadow-sm">
                חודשיים מתנה 🎁
              </span>
            </button>
            
            {/* אנימציית הרקע */}
            <motion.div
              layout
              className="absolute top-1.5 bottom-1.5 bg-slate-100 rounded-full shadow-inner"
              initial={false}
              animate={{
                left: billingCycle === "monthly" ? "auto" : "6px",
                right: billingCycle === "monthly" ? "6px" : "auto",
                width: billingCycle === "monthly" ? "88px" : "145px"
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </div>

        {/* הכרטיס המרכזי */}
        <div className="grid lg:grid-cols-12 gap-0 bg-white rounded-[32px] border border-slate-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden relative z-20">
            
            {/* צד ימין - הערך והפיצ'רים */}
            <div className="lg:col-span-7 p-8 md:p-12 border-b lg:border-b-0 lg:border-l border-slate-100 relative">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200 ring-4 ring-white">
                        <Star size={28} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900">FlowBot PRO</h3>
                        <p className="text-slate-500 font-medium">החבילה המלאה. הכול כלול.</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <FeatureItem text="בוט AI חכם (GPT-4o) ללא הגבלת שיחות*" icon={<Rocket size={16} fill="currentColor" />} />
                    <FeatureItem text="העלאת קבצים (PDF/Word) וסריקת אתר" />
                    <FeatureItem text="חיבור ליומן וקביעת תורים (Google Calendar)" />
                    <FeatureItem text="קבלת תשלומים (סליקה באשראי)" />
                    <FeatureItem text="תמיכה אישית ומהירה בוואטסאפ" />
                    <FeatureItem text={billingCycle === "monthly" ? "ללא התחייבות - בטל בכל רגע" : "חיסכון שנתי של ₪198"} />
                </div>
                
                <div className="mt-10 pt-6 border-t border-slate-100/80">
                    <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl">
                        <Info size={20} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-600 leading-relaxed">
                            <strong>למה המחיר הזה?</strong> <br/>
                            אנחנו בשלב השקה. המחיר יעלה בקרוב ל-{FUTURE_PRICE}₪, אבל הנרשמים עכשיו ישריינו את המחיר של {LAUNCH_PRICE}₪ לכל החיים.
                        </p>
                    </div>
                </div>

                {/* קישוט רקע עדין */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2" />
            </div>

            {/* צד שמאל - המחיר והתשלום */}
            <div className="lg:col-span-5 bg-slate-50/80 p-8 md:p-12 flex flex-col justify-center items-center text-center relative overflow-hidden">
                
                {/* תגית חיסכון */}
                <div className="mb-6 relative z-10">
                    <span className="bg-white text-slate-900 text-sm font-bold px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                        🚀 מחיר השקה מיוחד
                    </span>
                </div>

                <div className="flex items-center justify-center gap-1 mb-2 relative z-10">
                    {/* תיקון מחיר: תמיד 99 */}
                    <span className="text-7xl font-black text-slate-900 tracking-tighter">₪{currentPrice}</span>
                    <span className="text-xl text-slate-400 font-medium self-end mb-3">/חודש</span>
                </div>

                <div className="text-base text-slate-400 line-through mb-10 relative z-10 font-medium">
                    במקום ₪{FUTURE_PRICE}
                </div>

                <button
                    onClick={handleSelectPlan}
                    disabled={loading}
                    className="relative z-10 w-full bg-slate-900 text-white h-16 rounded-2xl font-bold text-xl hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    {/* 🎯 כיתוב מעודכן */}
                    {loading ? <Loader2 className="animate-spin" /> : <>המשך ל-Checkout <ArrowRight size={20} className="rotate-180" /></>}
                </button>

                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium relative z-10 bg-white/60 px-4 py-2 rounded-full">
                    <Shield size={16} className="text-emerald-500" />
                    <span>תשלום מאובטח. 30 יום החזר כספי.</span>
                </div>

                 {/* אלמנטים גרפיים ברקע הכרטיס הקטן */}
                 <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/40 rounded-full blur-3xl translate-x-10 -translate-y-10" />
                 <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-100/40 rounded-full blur-3xl -translate-x-10 translate-y-10" />
            </div>
        </div>

      </div>
    </main>
  );
}

/* --- רכיבי עזר --- */

function FeatureItem({ text, icon }: { text: string, icon?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${icon ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {icon || <Check size={14} strokeWidth={3} />}
            </div>
            <span className="text-slate-800 font-bold text-base">{text}</span>
        </div>
    );
}

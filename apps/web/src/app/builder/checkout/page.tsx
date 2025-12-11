"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Calendar,
  Gift
} from "lucide-react";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // נתוני טופס דמה
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // כאן תהיה הקריאה האמיתית ל-Stripe API
    // await stripe.confirmPayment(...)

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      
      // מעבר אוטומטי אחרי הצלחה
      setTimeout(() => {
        window.location.href = "/builder/publish";
      }, 2000);
    }, 2000);
  };

  // עיצוב כרטיס אשראי אוטומטי (לרושם בלבד)
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#F5F7FA] font-sans text-slate-900 flex items-center justify-center p-4 md:p-8" dir="rtl">
      
      <div className="w-full max-w-6xl grid lg:grid-cols-12 gap-8 items-start">
        
        {/* --- צד ימין: טופס התשלום --- */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <div>
                <h1 className="text-2xl font-black text-slate-900">תשלום מאובטח</h1>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <Lock size={12} className="text-emerald-500" />
                    <span>מוצפן ע"י Stripe SSL 256-bit</span>
                </div>
            </div>
            <div className="hidden md:flex gap-2">
                <div className="h-6 w-10 bg-slate-100 rounded flex items-center justify-center grayscale opacity-50"><CreditCard size={14}/></div>
                <div className="h-6 w-10 bg-slate-100 rounded flex items-center justify-center grayscale opacity-50 font-bold text-[10px]">VISA</div>
            </div>
          </div>

          <div className="p-8">
            {!success ? (
                <form onSubmit={handlePay} className="space-y-6 max-w-lg">
                    
                    {/* אימייל (כבר אמור להיות ידוע, אבל ליתר ביטחון) */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">אימייל לקבלה</label>
                        <input 
                            type="email" 
                            defaultValue="user@example.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>

                    {/* פרטי כרטיס */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">פרטי אשראי</label>
                            <div className="relative">
                                <CreditCard className="absolute top-3.5 right-3.5 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="0000 0000 0000 0000"
                                    maxLength={19}
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-mono tracking-wide focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">תוקף</label>
                                <input 
                                    type="text" 
                                    placeholder="MM / YY"
                                    maxLength={5}
                                    value={expiry}
                                    onChange={(e) => setExpiry(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-center focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">CVC</label>
                                <div className="relative">
                                    <Lock className="absolute top-3.5 right-3.5 text-slate-400" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="123"
                                        maxLength={3}
                                        value={cvc}
                                        onChange={(e) => setCvc(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-center focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">שם בעל הכרטיס</label>
                            <input 
                                type="text" 
                                placeholder="ISRAEL ISRAELI"
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm uppercase focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !cardNumber || !cvc}
                        className="w-full bg-black text-white h-14 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "שלם ₪99 והתחל"}
                    </button>
                    
                    <div className="text-center">
                        <Link href="/builder/pricing" className="text-xs text-slate-400 hover:text-slate-600 underline">
                            חזרה לבחירת מסלול
                        </Link>
                    </div>

                </form>
            ) : (
                // Success State
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6"
                    >
                        <CheckCircle2 size={40} strokeWidth={3} />
                    </motion.div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">התשלום עבר בהצלחה!</h2>
                    <p className="text-slate-500">תודה שהצטרפת ל-FlowBot.</p>
                    <p className="text-slate-400 text-sm mt-2">מעביר אותך להפעלת הבוט...</p>
                </div>
            )}
          </div>
        </motion.div>


        {/* --- צד שמאל: סיכום הזמנה --- */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 space-y-6"
        >
            <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-slate-900/20">
                {/* גרפיקת רקע */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10">
                    <h3 className="text-lg font-medium text-slate-300 mb-6">סיכום הזמנה</h3>
                    
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="text-3xl font-black mb-1">FlowBot PRO</div>
                            <div className="text-sm text-slate-400">חבילת השקה לכל החיים</div>
                        </div>
                        <div className="text-3xl font-black">₪99</div>
                    </div>

                    <div className="space-y-4 border-t border-slate-700/50 pt-6 mb-8">
                        <SummaryItem label="בוט AI חכם" value="כלול" />
                        <SummaryItem label="העלאת קבצים" value="ללא הגבלה" />
                        <SummaryItem label="מחזור חיוב" value="חודשי" />
                        <SummaryItem label="הטבת השקה" value="-₪100" highlight />
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-700 font-bold text-lg">
                        <span>סה״כ לתשלום</span>
                        <span>₪99 <span className="text-sm font-normal text-slate-400">/ חודש</span></span>
                    </div>
                </div>
            </div>

            {/* הבטחת החזר */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">הבטחת החזר כספי מלא</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        נסה אותנו למשך 30 יום. אם לא תהיה מרוצה מהתוצאות, 
                        קבל את כספך בחזרה. בלי שאלות.
                    </p>
                </div>
            </div>

            {/* פרטי תמיכה */}
            <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                <span className="hover:text-slate-600 cursor-pointer">תנאי שימוש</span>
                <span className="hover:text-slate-600 cursor-pointer">מדיניות פרטיות</span>
                <span className="flex items-center gap-1"><Lock size={10}/> תשלום מאובטח</span>
            </div>

        </motion.div>
      </div>
    </main>
  );
}

function SummaryItem({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{label}</span>
            <span className={highlight ? "text-emerald-400 font-bold" : "text-white font-medium"}>
                {value}
            </span>
        </div>
    );
}

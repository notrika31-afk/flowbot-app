"use client";
export const dynamic = 'force-dynamic';
import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  Clock, 
  Zap, 
  TrendingUp, 
  Users, 
  Target, 
  Shield, 
  Lock, 
  Repeat, 
  Quote,
  Star
} from "lucide-react";

/* ===== אנימציות ===== */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

/* -------------------------------------------------------------------------- */
/* רכיבים פנימיים - מוגדרים ראשונים */
/* -------------------------------------------------------------------------- */

// --- רכיבים קטנים (Pill, Card, Step) ---

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white text-slate-700 border border-slate-200 px-3 py-1 text-[10px] font-medium shadow-sm whitespace-nowrap">
      {children}
    </span>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <motion.div
      className="rounded-2xl p-5 bg-white border border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="text-sm font-semibold text-slate-900 mb-1.5">
        {title}
      </div>
      <div className="text-[12px] text-slate-600 leading-relaxed">{desc}</div>
    </motion.div>
  );
}

function Step({ i, title, desc }: { i: number; title: string; desc: string }) {
  return (
    <motion.div
      className="rounded-2xl p-5 bg-white border border-slate-200 shadow-[0_10px_26px_rgba(15,23,42,0.06)]"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      custom={i}
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="text-[11px] font-semibold text-slate-500 mb-1">
        שלב {i + 1}
      </div>
      <div className="text-sm font-semibold text-slate-900 mb-1">
        {title}
      </div>
      <div className="text-[12px] text-slate-600 leading-relaxed">
        {desc}
      </div>
    </motion.div>
  );
}

// --- בועות צ׳אט (כולל Typing/Dot) ---

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500"
      animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, delay }}
    />
  );
}

function Typing() {
  return (
    <motion.div
      className="mr-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900/4 border border-slate-200"
      variants={fadeUp}
      custom={3}
    >
      <Dot /> <Dot delay={0.12} /> <Dot delay={0.24} />
    </motion.div>
  );
}

function BubbleYou({ children, i = 0 }: { children: React.ReactNode; i?: number }) {
  return (
    <motion.div
      className="mr-auto max-w-[85%] rounded-2xl rounded-br-md bg-slate-900/5 text-slate-800 px-4 py-2 text-[12px] border border-slate-200 shadow-sm"
      variants={fadeUp}
      custom={i}
    >
      {children}
    </motion.div>
  );
}

function BubbleMe({ children, i = 0 }: { children: React.ReactNode; i?: number }) {
  return (
    <motion.div
      className="ml-auto max-w-[85%] rounded-2xl rounded-bl-md bg-[#506DFF] text-white px-4 py-2 text-[12px] shadow-[0_10px_24px_rgba(80,109,255,0.55)]"
      variants={fadeUp}
      custom={i}
    >
      {children}
    </motion.div>
  );
}


// --- רכיבי סקשנים (Trust, Value, Testimonials) ---

function TrustFeature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <motion.div
            className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white/50"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
        >
            <div className="p-2 bg-slate-900/5 rounded-lg border border-slate-200 shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </motion.div>
    );
}

function TrustSection() {
    return (
        <section className="px-4 sm:px-8 pb-10">
            <motion.div
                className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl border-4 border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.15)] bg-gradient-to-br from-white to-[#f0f2f7]"
                initial="hidden"
                whileInView="show"
                variants={stagger}
                viewport={{ once: true, amount: 0.3 }}
            >
                <TrustFeature 
                    icon={<Shield size={20} className="text-green-600"/>}
                    title="חיבור Meta מאושר"
                    desc="עובד עם Cloud API הרשמי. אין חשש לחסימת מספרים עסקיים."
                />
                <TrustFeature 
                    icon={<Lock size={20} className="text-blue-600"/>}
                    title="אבטחת מידע מוצפנת"
                    desc="כל נתוני הלקוחות (כולל ה-Token שלך) מוצפנים ונשמרים בסטנדרט הגבוה ביותר."
                />
                <TrustFeature 
                    icon={<Repeat size={20} className="text-purple-600"/>}
                    title="זמינות 99.9% מובטחת"
                    desc="המערכת יציבה לחלוטין. הבוט שלך תמיד עובד, גם בעומסים גבוהים."
                />
            </motion.div>
        </section>
    );
}

function MetricRow({ icon, title, legacy, flowbot, i, desc }: { icon: React.ReactNode, title: string, legacy: string, flowbot: string, i: number, desc: string }) {
  return (
    <motion.div
      // min-w-[600px] מאפשר גלילה בטבלה בנייד בלי לשבור אותה
      className="grid grid-cols-5 py-4 items-center border-b border-slate-100 last:border-b-0 min-w-[600px]" 
      variants={fadeUp}
      custom={i + 1}
    >
      <div className="col-span-2 flex flex-col gap-0.5 text-right">
        <div className="flex items-center gap-3 justify-end">
            <span className="text-sm font-medium text-slate-800">{title}</span>
            <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-200 shrink-0">{icon}</div>
        </div>
        <p className="text-[10px] text-slate-400 font-medium mr-12">{desc}</p>
      </div>
      <div className="text-center text-sm font-mono text-red-600/90 font-medium">{legacy}</div>
      <div className="col-span-2 text-center text-sm font-mono text-emerald-600 font-bold">
        {flowbot}
        {i === 0 && <span className="text-[9px] block text-emerald-500">24/7 ללא הפסקה</span>}
      </div>
    </motion.div>
  );
}

function ValueSection() {
  const roiValue = 4200; 
  
  return (
    <section className="px-4 sm:px-8 pb-12 pt-4">
      <motion.div 
        className="text-center mb-12"
        initial="hidden"
        whileInView="show"
        variants={stagger}
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.p
            className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-slate-500 mb-3"
            variants={fadeUp}
            custom={0}
        >
            השקעה חכמה. תוצאות מיידיות.
        </motion.p>
        <motion.h2 
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3 leading-[1.1]"
          variants={fadeUp}
          custom={1}
        >
          איך FlowBot הופך <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500">
            עלות להכנסה.
          </span>
        </motion.h2>
        <motion.p 
          className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed mt-4"
          variants={fadeUp}
          custom={2}
        >
          עבודה ידנית ב-WhatsApp שווה כסף. FlowBot ממכן את הטיפול בלידים ובשאלות נפוצות, חוסך שעות עבודה יקרות ומבטיח שאף לקוח לא מחכה.
        </motion.p>
      </motion.div>

      {/* קארד השוואתי מרכזי - מורחב */}
      <motion.div
        className="max-w-4xl mx-auto rounded-3xl bg-white border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] md:shadow-[18px_18px_0px_0px_rgba(15,23,42,1)] p-4 md:p-8 relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.3 }}
        viewport={{ once: true, amount: 0.1 }}
      >
        
        {/* --- התאמה לנייד: גלילה אופקית --- */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="grid grid-cols-5 pb-3 border-b-2 border-slate-200/70 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center min-w-[600px]">
                <span className="col-span-2 text-right pr-12">מדד ביצוע</span>
                <span className="text-red-700/80">שיטה ידנית</span>
                <span className="col-span-2 text-emerald-700/80">FlowBot (אוטומציה)</span>
            </div>

            {/* שורות המדדים המונפשות */}
            <motion.div 
            className="divide-y divide-slate-100"
            initial="hidden"
            whileInView="show"
            variants={stagger}
            viewport={{ once: true, amount: 0.1 }}
            >
            <MetricRow 
                i={0} 
                icon={<Clock size={20} className="text-blue-500"/>} 
                title="זמן תגובה ממוצע" 
                desc="הזמן שלקוח מחכה למענה ראשוני"
                legacy="25 - 50 דקות" 
                flowbot="< 5 שניות" 
            />
            <MetricRow 
                i={1} 
                icon={<DollarSign size={20} className="text-green-500"/>} 
                title="עלות עובד לשעת מענה" 
                desc="שכר מינימום + הוצאות נלוות"
                legacy="₪35 לשעה" 
                flowbot="₪0.009 להודעה" 
            />
            <MetricRow 
                i={2} 
                icon={<Target size={20} className="text-purple-500"/>} 
                title="דיוק ואיסוף מידע" 
                desc="בשלב ה-Qualification של הליד"
                legacy="כ-70% דיוק" 
                flowbot="99% (בניית Flow)" 
            />
            <MetricRow 
                i={3} 
                icon={<TrendingUp size={20} className="text-red-500"/>} 
                title="אחוז המרה בלילה" 
                desc="לידים המגיעים בין 20:00 ל-08:00"
                legacy="0% (החמצת ליד)" 
                flowbot="60%+ המרה מיידית" 
            />
            <MetricRow 
                i={4} 
                icon={<Users size={20} className="text-orange-500"/>} 
                title="יכולת טיפול במקביל" 
                desc="מספר הלקוחות שאפשר לטפל בהם"
                legacy="1-3 לקוחות" 
                flowbot="אינסופי (ללא תור)" 
            />
            </motion.div>
        </div>
        
        {/* סיכום והנעה לפעולה */}
        <div className="mt-8 pt-6 border-t border-slate-200/70 flex flex-col md:flex-row justify-between items-center gap-4">
            
            <motion.p 
                className="text-base md:text-lg font-bold text-slate-900 text-center md:text-right"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true, amount: 0.1 }}
            >
                🔥 **חסכון פוטנציאלי חודשי ממוצע:** <span className="text-emerald-600 ml-2 text-xl md:text-2xl">
                    מעל ₪{roiValue.toLocaleString()}
                </span>
            </motion.p>
            
            <Link
                href="/builder"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-sm px-7 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.55)] hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.65)] transition font-bold whitespace-nowrap w-full md:w-auto justify-center"
            >
                💰 חשב את ה-ROI שלך עכשיו
            </Link>
        </div>

      </motion.div>
    </section>
  );
}

function TestimonialCard({ text, name, title, rating, i }: { text: string, name: string, title: string, rating: number, i: number }) {
    return (
        <motion.div
            className="rounded-2xl p-6 bg-white border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.1)] flex flex-col justify-between h-full"
            variants={fadeUp}
            custom={i + 1}
        >
            <div className="flex items-center gap-2 mb-4 text-amber-500">
                {Array.from({ length: rating }).map((_, idx) => (
                    <Star key={idx} size={16} fill="currentColor" className="text-amber-500" />
                ))}
            </div>
            
            <Quote size={24} className="text-slate-200 mb-4" />

            <p className="text-[13px] font-medium text-slate-800 leading-relaxed italic flex-1">
                "{text}"
            </p>

            <div className="mt-5 pt-3 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-900">{name}</p>
                <p className="text-[11px] text-slate-500">{title}</p>
            </div>
        </motion.div>
    );
}

function TestimonialsSection() {
    const testimonialsData = [
        { 
            text: "הרובוט קיצר לנו את זמן התגובה הממוצע מ-45 דקות ל-5 שניות. הלידים פשוט לא מחכים יותר!", 
            name: "איתי לוי", 
            title: "מנכ\"ל, לוי פתרונות דיגיטליים", 
            rating: 5 
        },
        { 
            text: "היה חשוב לנו מערכת יציבה ומאובטחת. FlowBot עבר את כל הבדיקות שלנו ועושה את העבודה בצורה מושלמת.", 
            name: "נועה כהן", 
            title: "ראש צוות אוטומציה, קבוצת נגה", 
            rating: 5 
        },
        { 
            text: "הצלחנו להכפיל את כמות הפגישות שנקבעו דרך הווטסאפ בלי להוסיף עובד אחד. זה פשוט מחליף מוקד שירות שלם.", 
            name: "דניאל שקד", 
            title: "בעלים, שקד מערכות", 
            rating: 5 
        },
    ];

    return (
        <section className="px-4 sm:px-8 pb-12 pt-4">
            <motion.div
                className="text-center mb-10"
                initial="hidden"
                whileInView="show"
                variants={stagger}
                viewport={{ once: true, amount: 0.2 }}
            >
                <motion.p
                    className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-slate-500 mb-3"
                    variants={fadeUp}
                    custom={0}
                >
                    מה הלקוחות שלנו אומרים
                </motion.p>
                <motion.h2
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-3 leading-[1.1]"
                    variants={fadeUp}
                    custom={1}
                >
                    ההוכחה נמצאת בשיחות.
                </motion.h2>
            </motion.div>

            <motion.div
                className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
                initial="hidden"
                whileInView="show"
                variants={stagger}
                viewport={{ once: true, amount: 0.1 }}
            >
                {testimonialsData.map((t, index) => (
                    <TestimonialCard
                        key={index}
                        text={t.text}
                        name={t.name}
                        title={t.title}
                        rating={t.rating}
                        i={index}
                    />
                ))}
            </motion.div>
        </section>
    );
}


/* -------------------------------------------------------------------------- */
/* הרכיב הראשי - HomePage                               */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#how") {
      history.replaceState(null, "", window.location.pathname);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, []);

  return (
    <main className="min-h-screen w-full bg-[#e9edf5] text-slate-900 flex items-center justify-center px-2 py-4 sm:px-4 sm:py-6 overflow-x-hidden">
      {/* ===== FRAME שחור/יוקרתי עם קצת חיים ===== */}
      <div className="relative w-full max-w-6xl mx-auto rounded-[24px] md:rounded-[46px] border border-slate-900/80 bg-[#f5f7fb] shadow-[0_10px_40px_rgba(15,23,42,0.4)] md:shadow-[0_28px_80px_rgba(15,23,42,0.55)] overflow-hidden">

        {/* הילה וגלואו עדין סביב המסגרת */}
        <div className="pointer-events-none absolute -inset-[1px] rounded-[24px] md:rounded-[46px] border border-slate-900/70" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 rounded-[24px] md:rounded-[46px] opacity-60 mix-blend-soft-light animate-pulse"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(80,109,255,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(45,212,191,0.16), transparent 55%)",
          }}
        />

        {/* ===== תוכן העמוד ===== */}
        <div className="relative z-10">
          {/* ניווט עליון */}
          <header className="px-4 sm:px-8 pt-4 sm:pt-6 pb-4 flex items-center justify-between">
            {/* לוגו גליף חדש */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] border border-slate-900/10 overflow-hidden">
                {/* פס אנכי באמצע ליצירת FB גליפית */}
                <div className="absolute inset-y-2 left-1/2 w-px bg-slate-900/10" />
                <span className="relative flex items-center gap-[2px] text-[11px] font-semibold tracking-[0.28em] text-slate-900 uppercase">
                  <span className="translate-x-[1px]">F</span>
                  <span className="-translate-x-[1px] opacity-90">B</span>
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-slate-500">
                  FlowBot
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400">
                  WhatsApp Automation
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-3 text-xs">
              <Link
                href="/builder"
                className="px-4 py-2 rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition text-[12px] flex items-center gap-1"
              >
                🧠 בונה תסריט
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full border border-transparent text-slate-600 hover:bg-slate-100/70 hover:-translate-y-[1px] transition text-[12px]"
              >
                התחברות
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-full bg-[#506DFF] text-white text-[12px] font-semibold shadow-[0_10px_25px_rgba(80,109,255,0.45)] hover:shadow-[0_16px_40px_rgba(80,109,255,0.6)] hover:-translate-y-[1px] transition"
              >
                פתח חשבון
              </Link>
            </nav>

            {/* כפתור כניסה למובייל (חדש) */}
            <Link 
                href="/login"
                className="md:hidden px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold"
            >
                כניסה
            </Link>
          </header>

          {/* HERO */}
          <section className="px-4 sm:px-8 pb-10 pt-4 flex flex-col-reverse md:grid md:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-10 items-center">
            {/* טקסט מימין */}
            <motion.div
              className="text-center md:text-right"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.p
                className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-slate-500 mb-3"
                variants={fadeUp}
                custom={0}
              >
                מערכת בוטים לוואטסאפ · AI Studio
              </motion.p>

              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.9rem] font-extrabold leading-[1.15]
                           text-slate-900"
                variants={fadeUp}
                custom={1}
              >
                בנה מסלול שיחה חכם
                <br />
                לוואטסאפ —{" "}
                <span className="inline-block bg-gradient-to-r from-[#506DFF] via-[#6366F1] to-[#22c1c3] bg-clip-text text-transparent">
                  בדקות ספורות
                </span>
              </motion.h1>

              <motion.p
                className="mt-4 text-sm md:text-base text-slate-600 max-w-[50ch] mx-auto md:ml-auto md:mr-0 leading-relaxed"
                variants={fadeUp}
                custom={2}
              >
                FlowBot עוזר לך להקים מערכת וואטסאפ שעונה ללקוחות, אוספת לידים
                וסוגרת פגישות — בלי קוד, בלי כאב ראש, ועם חיבור מאובטח.
              </motion.p>

              <motion.div
                className="mt-6 flex flex-wrap justify-center md:justify-end gap-3"
                variants={fadeUp}
                custom={3}
              >
                <Link
                  href="/builder"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-sm px-6 py-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.55)] hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.65)] transition"
                >
                  🚀 התחל לבנות מסלול
                </Link>
                <Link
                  href="#how"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/70 text-xs md:text-[13px] px-5 py-2 text-slate-700 hover:bg-slate-50 hover:-translate-y-[1px] transition"
                >
                  איך זה עובד?
                </Link>
              </motion.div>

              <motion.div
                className="mt-5 flex flex-wrap justify-center md:justify-end gap-2 text-[11px]"
                variants={fadeUp}
                custom={4}
              >
                <Pill>⏱️ מוכן תוך דקות</Pill>
                <Pill>💬 AI חכם</Pill>
                <Pill>📲 חיבור רשמי</Pill>
              </motion.div>
            </motion.div>

            {/* הדמיית צ׳אט משמאל */}
            <motion.div
              className="relative flex justify-center items-center w-full"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
            >
              {/* לוח צף לבן/אפור עם עומק */}
              <div className="relative w-full max-w-[340px] md:max-w-[380px] rounded-[32px] bg-gradient-to-br from-white to-[#e8ecf7] border border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.35)] px-5 py-5">
                {/* "אנטנות" UI קטנות למעלה */}
                <div className="flex items-center justify-between mb-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    FlowBot · הדמיה
                  </span>
                  <span>24/7 Online</span>
                </div>

                {/* בועות שיחה */}
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                  key="chat-bubbles-container"
                >
                  <BubbleYou i={0} key="bubble-0">שלום, ספר לי בקצרה על העסק שלך ✨</BubbleYou>
                  <BubbleMe i={1} key="bubble-1">
                    אני צריך בוט לניהול לידים מהפייסבוק.
                  </BubbleMe>
                  <BubbleYou i={2} key="bubble-2">
                    מעולה. מה חשוב לך? שירות לקוחות או מכירות?
                  </BubbleYou>
                  <Typing key="typing-indicator" />
                </motion.div>

                {/* שורת אינפוט מדומה */}
                <div className="mt-4 flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
                  <span className="text-[11px] text-slate-400 flex-1">
                    הקלד כאן...
                  </span>
                  <button className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white shadow hover:scale-105 transition">
                    ⇪
                  </button>
                </div>

                <div className="pointer-events-none absolute -z-10 inset-0 rounded-[42px] opacity-80 blur-2xl"
                  style={{ backgroundImage: "radial-gradient(circle at 10% 0%, rgba(80,109,255,0.5), transparent 55%), radial-gradient(circle at 100% 100%, rgba(45,212,191,0.45), transparent 60%)" }}
                />
              </div>
            </motion.div>
          </section>

          {/* שאר הסקשנים... */}
          <TrustSection />

          <section className="px-4 sm:px-8 pb-10">
            <h2 className="text-center text-xl md:text-2xl font-semibold text-slate-900 mb-6">
              למה לבחור ב־FlowBot?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card
                title="AI שמבין עסקית"
                desc="המערכת שואלת כמה שאלות חכמות, בונה מפת שיחה ומייצרת תסריט מדויק לקהל שלך."
              />
              <Card
                title="חיבור מלא ל־WhatsApp"
                desc="עובד עם WhatsApp Business / Cloud API, בתצורה מאובטחת ומוכנה ל־Scale."
              />
              <Card
                title="בונים, בודקים ואז מחברים"
                desc="אתה רואה סימולציה מלאה, מתקן, משפר ורק כשהכול מושלם — מחבר ללקוחות שלך."
              />
            </div>
          </section>

          <ValueSection />
          <TestimonialsSection />

          <section id="how" className="px-4 sm:px-8 pb-10">
            <h2 className="text-center text-xl md:text-2xl font-semibold text-slate-900 mb-7">
              איך זה עובד?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-[13px]">
              <Step i={0} title="1. מספרים על העסק" desc="כמה משפטים על מי אתם, מה אתם מציעים ולמי." />
              <Step i={1} title="2. FlowBot בונה מסלול" desc="מערכת ה־AI מייצרת תסריט שיחה מסודר עם שלבים ברורים." />
              <Step i={2} title="3. סימולציה חיה" desc="משחקים עם התסריט, רואים איך שיחה אמיתית תיראה ומתאימים." />
              <Step i={3} title="4. חיבור לוואטסאפ" desc="חיבור מאובטח ל־WhatsApp Business ושחרור הבוט ללקוחות." />
            </div>

            <div className="text-center mt-8 pb-2">
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 rounded-full bg-[#506DFF] text-white text-sm px-7 py-2.5 shadow-[0_16px_40px_rgba(80,109,255,0.6)] hover:-translate-y-[1px] transition"
              >
                🚀 התחל לבנות את המסלול שלך
              </Link>
            </div>
          </section>

          {/* פוטר */}
          <footer className="px-4 sm:px-8 pb-5 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/70 gap-2">
            <span>FlowBot © 2025 — כל הזכויות שמורות</span>
            <span className="text-center sm:text-left">
              נבנה עם דגש על אבטחה, מהירות וחוויית משתמש.
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
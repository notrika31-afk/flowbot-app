"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PricingPage() {
  return (
    <div className="min-h-screen w-full bg-[#0A0F1F] text-white flex flex-col items-center px-6 py-20">

      {/* כותרת */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-extrabold text-center bg-gradient-to-r from-[#6b30ff] to-[#37b6ff] bg-clip-text text-transparent"
      >
        בחר את החבילה שמתאימה לך
      </motion.h1>

      <p className="mt-4 text-gray-300 text-center max-w-2xl">
        התחל לבנות בוטים חכמים לוואטסאפ, אתר, פייסבוק או כל מערכת אחרת.  
        כל החבילות כוללות תמיכה מלאה ושדרוגים שוטפים.
      </p>

      {/* כרטיסי חבילות */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16 w-full max-w-6xl">

        {/* BASIC */}
        <PricingCard
          title="Basic"
          price="₪79"
          tagline="מעולה לעסקים קטנים שרוצים מענה מיידי 24/7."
          features={[
            "בוט אחד פעיל",
            "מענה אוטומטי לחמש שאלות נפוצות",
            "איסוף לידים כולל שליחה למייל",
            "תמיכה בסיסית",
          ]}
          buttonText="התחל עכשיו"
          link="/register"
        />

        {/* PRO – חבילה מומלצת */}
        <PricingCard
          title="Pro"
          price="₪249"
          tagline="רמה מקצועית – בוט שסוגר מכירות לבד."
          popular
          features={[
            "עד 3 בוטים שונים",
            "אוטומציות חכמות",
            "תיאום פגישות אוטומטי",
            "איסוף לידים + חיבור ל-CRM",
            "תמיכה מהירה",
          ]}
          buttonText="החבילה הפופולרית"
          link="/register"
        />

        {/* ELITE */}
        <PricingCard
          title="Elite"
          price="₪599"
          tagline="מערכת אוטומציה מלאה, כולל חיבורי API מתקדמים."
          features={[
            "בוטים ללא הגבלה",
            "אוטומציות מורכבות",
            "סגמנטציה לפי התנהגות לקוח",
            "חיבור API מלא",
            "תמיכה VIP",
          ]}
          buttonText="אני רוצה פרימיום"
          link="/register"
        />
      </div>
    </div>
  );
}

function PricingCard({ title, price, tagline, features, buttonText, link, popular = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative rounded-3xl p-8 bg-[#0F152A]/80 border border-white/10 shadow-xl backdrop-blur-xl`}
    >
      {/* תווית פופולרי */}
      {popular && (
        <div className="absolute top-4 right-4 bg-gradient-to-r from-[#6b30ff] to-[#37b6ff] text-xs px-3 py-1 rounded-full font-semibold">
          הכי נמכרת
        </div>
      )}

      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="text-gray-300 mt-2">{tagline}</p>

      <div className="mt-6">
        <div className="text-5xl font-extrabold">{price}</div>
        <div className="text-gray-400 text-sm mt-1">לחודש</div>
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="text-[#37b6ff] text-lg">✔</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={link}
        className="block text-center mt-10 bg-gradient-to-r from-[#6b30ff] to-[#37b6ff] hover:opacity-90 transition rounded-xl py-3 font-semibold"
      >
        {buttonText}
      </Link>
    </motion.div>
  );
}
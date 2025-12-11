// src/components/ui/HowToFindModal.tsx

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Hash, Smartphone, Lock } from "lucide-react";

interface HowToFindModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: <Smartphone size={20} className="text-[#25D366]" />,
    title: "Phone Number ID & WABA ID",
    desc: "את שני המזהים הללו תמצאו בעמוד ה-Getting Started תחת מוצר WhatsApp בפורטל המפתחים של Meta. ה-WABA ID מופיע בראש המקטע, וה-Phone ID ממש מתחתיו.",
    linkText: "עמוד ה-Getting Started בפורטל Meta",
    linkHref: "https://developers.facebook.com/apps/YOUR_APP_ID/whatsapp/getting-started/", // קישור דמה, יש להחליף
  },
  {
    icon: <Lock size={20} className="text-red-500" />,
    title: "Permanent Token (טוקן קבוע)",
    desc: "הטוקן הזמני שמוצג פג תוך 24 שעות. כדי ליצור חיבור יציב, יש לעבור ללשונית Configuration ומשם לאשף יצירת הטוקן הקבוע דרך הגדרות חשבון העסקי שלכם.",
    linkText: "מידע על יצירת טוקן קבוע",
    linkHref: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/get-tokens/", // קישור רשמי של מטא
  },
];

export default function HowToFindModal({ isOpen, onClose }: HowToFindModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-[2rem] border-[4px] border-neutral-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg mx-auto p-8 relative overflow-hidden text-right"
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            onClick={(e) => e.stopPropagation()} // מונע סגירה בלחיצה על המודאל
          >
            {/* כפתור סגירה */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <X size={20} className="text-neutral-600" />
            </button>

            {/* כותרת */}
            <h2 className="text-3xl font-black tracking-tight text-neutral-900 mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-green-600 to-teal-500">
                איפה מוצאים
              </span>{" "}
              את הנתונים?
            </h2>
            <p className="text-sm text-neutral-500 font-medium mb-8 max-w-sm">
              כל הנתונים נלקחים מתוך פורטל **Meta for Developers** תחת האפליקציה שהגדרתם ל-WhatsApp.
            </p>

            {/* שלבי הפעולה */}
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col gap-3 p-4 rounded-xl border border-neutral-100 bg-neutral-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border-2 border-neutral-200 shrink-0">
                        {step.icon}
                    </div>
                    <h3 className="font-bold text-lg text-neutral-900">{step.title}</h3>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed mr-1">{step.desc}</p>
                  <a 
                    href={step.linkHref} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-bold text-neutral-600 hover:text-neutral-900 underline decoration-neutral-200 underline-offset-4 flex items-center justify-end gap-1 mt-1"
                  >
                    מעבר לפורטל מטא
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

interface MainHeaderProps {
  user?: User | null; // המשתמש שמגיע מהשרת (Initial State)
}

export default function MainHeader({ user: serverUser }: MainHeaderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(serverUser || null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // בדיקה חכמה: גם אם השרת לא מעודכן, נבדוק מול ה-API בצד לקוח
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      }
    };

    // אם אין לנו משתמש מהשרת, או סתם כדי לוודא - נבדוק שוב
    fetchUser();
  }, [pathname]); // רץ בכל מעבר עמוד כדי לוודא שהסטטוס עדכני

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null); // איפוס מיידי בתצוגה
      setIsMenuOpen(false);
      router.push("/"); 
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // עיצוב נקי ולבן שנשאר למעלה (sticky)
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-6 md:px-10 py-4 max-w-7xl mx-auto">
        
        {/* צד ימין: לוגו */}
        <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight text-slate-900 group">
          <span className="bg-black text-white px-2 py-1 rounded-lg text-sm border-2 border-black group-hover:bg-white group-hover:text-black transition-colors">
            FB
          </span>
          <span>FlowBot</span>
        </Link>

        {/* צד שמאל: אזור אישי */}
        <div className="flex items-center gap-4">
          {currentUser ? (
            // --- מחובר: כפתור שחור עם דרופ-דאון ---
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-3 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs text-white">
                  {currentUser.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:inline-block max-w-[120px] truncate">
                  {currentUser.name || currentUser.email?.split('@')[0]}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* תפריט נפתח */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white border-2 border-black rounded-xl shadow-xl overflow-hidden flex flex-col z-50"
                  >
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs text-gray-500">מחובר כ-</p>
                      <p className="text-sm font-bold truncate text-gray-800">{currentUser.email}</p>
                    </div>

                    <Link 
                      href="/dashboard" 
                      className="px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-slate-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>📊</span> דשבורד
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="px-4 py-3 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 text-right w-full border-t border-gray-100 transition-colors"
                    >
                      <span>🚪</span> התנתק
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // --- אורח: כפתורים רגילים ---
            <div className="flex items-center gap-4 text-sm font-medium">
              <Link href="/login" className="text-slate-600 hover:text-black transition-colors">
                התחברות
              </Link>
              <Link
                href="/register"
                className="bg-black text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>+</span>
                <span>בוט חדש</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
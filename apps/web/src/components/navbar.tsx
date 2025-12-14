"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  email: string;
  name?: string;
}

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();

  // בדיקה האם המשתמש מחובר בטעינת האתר
  useEffect(() => {
    checkUser();
  }, [pathname]); // רץ מחדש בכל מעבר דף כדי לוודא סנכרון

  async function checkUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setIsMenuOpen(false);
    router.push("/"); // חזרה לדף הבית
    router.refresh(); // רענון מלא לניקוי מצב
  }

  // אל תציג את ה-Navbar בתוך הדשבורד עצמו (אם יש שם Sidebar נפרד)
  // אם אתה רוצה שזה יופיע גם בדשבורד, תמחק את השורות הבאות
  if (pathname.startsWith("/dashboard") && pathname !== "/dashboard") {
    // return null; 
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-center items-start pointer-events-none">
      {/* Container - Pointer events auto כדי שהכפתורים יעבדו */}
      <div className="pointer-events-auto bg-white/80 backdrop-blur-md border-2 border-black rounded-2xl px-6 py-3 flex items-center justify-between w-full max-w-5xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="bg-black text-white px-2 py-1 rounded-lg text-sm">FB</span>
          FlowBot
        </Link>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          {loading ? (
            // Loading State (Skeleton)
            <div className="w-24 h-8 bg-gray-200 animate-pulse rounded-lg" />
          ) : user ? (
            // --- User Logged In ---
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 text-sm font-medium hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-black/10"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                  {user.email[0].toUpperCase()}
                </div>
                {user.email}
                <svg
                  className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
                  >
                    <Link 
                      href="/dashboard" 
                      className="px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>📊</span> דשבורד
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-3 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 text-right w-full"
                    >
                      <span>🚪</span> התנתק
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // --- Guest State ---
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link href="/login" className="hover:underline">
                התחברות
              </Link>
              <Link
                href="/register"
                className="bg-black text-white px-4 py-2 rounded-lg border-2 border-transparent hover:bg-white hover:text-black hover:border-black transition-all"
              >
                פתח חשבון
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
// src/components/MainHeader.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { User, LogOut, LayoutGrid, ChevronDown, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// הגדרת טיפוס למשתמש (חייב להתאים למה שחוזר מ-getUserSession)
type UserSession = {
  id: string;
  email?: string;
  name?: string;
  role?: string;
} | null;

export default function MainHeader({ user }: { user: UserSession }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // רענון חזק של הדף כדי לאפס את המצב בשרת
      router.refresh();
      setMenuOpen(false);
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* לוגו */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-md group-hover:scale-105 transition-transform">
            <span className="font-bold text-[10px] tracking-widest">FB</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">FlowBot</span>
        </Link>

        {/* אזור אישי / התחברות */}
        <div>
          {user ? (
            // === מצב מחובר: הצגת אימייל ותפריט ===
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full pl-3 pr-4 py-1.5 transition-all shadow-sm"
              >
                <div className="w-6 h-6 bg-[#506DFF] rounded-full flex items-center justify-center text-white">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate" dir="ltr">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* תפריט נפתח (Dropdown) */}
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1"
                    >
                      <div className="px-4 py-2 border-b border-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">חשבון</p>
                        <p className="text-xs font-medium text-slate-700 truncate" dir="ltr">{user.email}</p>
                      </div>

                      <div className="p-1">
                        <Link 
                          href="/dashboard" 
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <LayoutGrid className="w-4 h-4 text-slate-500" />
                          דשבורד ראשי
                        </Link>
                        
                        <Link 
                          href="/build" 
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Rocket className="w-4 h-4 text-slate-500" />
                          בניית בוט חדש
                        </Link>
                      </div>

                      <div className="h-[1px] bg-slate-100 my-1" />
                      
                      <div className="p-1">
                        <button
                          onClick={handleLogout}
                          disabled={isLoading}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {isLoading ? 'מתנתק...' : 'התנתק'}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // === מצב מנותק: כפתורי התחברות ===
            <div className="flex items-center gap-3">
              <Link 
                href="/login"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                כניסה
              </Link>
              <Link 
                href="/signup"
                className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-slate-800 transition-all shadow-md active:translate-y-[1px]"
              >
                התחל בחינם
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

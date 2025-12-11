'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // נסיון לתפוס את הכתובת לחזרה. ברירת מחדל: דשבורד.
  const [callbackUrl, setCallbackUrl] = useState('/dashboard');

  useEffect(() => {
    const url = searchParams.get('callbackUrl');
    if (url) {
      console.log("Target destination found:", url);
      setCallbackUrl(url);
    }
  }, [searchParams]);

  // State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log("Attempting login...");

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode: 'login' }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("Login successful! Redirecting to:", callbackUrl);
        
        // --- השינוי הגדול: ניווט בכוח (Hard Refresh) ---
        // זה מבטיח שהדפדפן והשרת מסונכרנים ב-100% על העוגייה החדשה
        window.location.href = callbackUrl; 

      } else {
        setError(data.message || 'שגיאה בהתחברות. אנא בדוק את הפרטים.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('שגיאה בתקשורת. ייתכן שיש בעיה בחיבור לשרת.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-6 bg-[#f5f5f8]" dir="rtl">
      
      {/* כפתור חזרה */}
      <button 
        onClick={() => router.back()}
        className="absolute top-6 right-6 p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-black transition-colors z-20 shadow-sm"
      >
        <ArrowRight className="w-5 h-5 text-gray-600" />
      </button>

      {/* רקע דקורטיבי עדין */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="bg-white border-[3px] border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
               <span className="font-bold text-white tracking-widest text-lg">FB</span>
            </div>
            <h1 className="text-2xl font-black text-black">התחברות למערכת</h1>
            <p className="text-gray-500 text-sm mt-2 font-medium">ברוך שובך ל-FlowBot</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* הודעת שגיאה */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-900 mb-1 block px-1">אימייל</label>
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-black focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-900 mb-1 block px-1">סיסמה</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-black focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white h-12 rounded-xl font-bold text-sm hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6 shadow-md active:translate-y-0.5"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  מתחבר...
                </span>
              ) : (
                <>
                  כניסה
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-gray-100">
             <Link 
               href={`/register${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} 
               className="text-sm text-gray-500 hover:text-black transition-colors inline-flex items-center gap-1 group"
             >
               אין לך חשבון? <span className="font-bold underline decoration-2 decoration-transparent group-hover:decoration-black underline-offset-4 transition-all">הירשם בחינם</span>
             </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, LockKeyhole, ArrowRight } from 'lucide-react';

export default function EntryGatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/build';
  
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [isLoading, setIsLoading] = useState(false);
  
  // State עבור הטופס
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // קריאה ל-API בשרת ליצירת סשן יציב ל-30 יום
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode }),
      });

      if (res.ok) {
        // רענון כדי שה-Middleware יקלוט את העוגייה החדשה
        router.refresh(); 
        // הפניה ליעד
        router.push(callbackUrl);
      } else {
        alert('שגיאה בהתחברות, נסה שוב');
      }
    } catch (error) {
      console.error('Auth failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ... (שאר ה-JSX נשאר זהה לקוד העיצוב הקודם, רק פונקציית handleAuth השתנתה)
  return (
      // ... השתמש באותו JSX מהתשובה הקודמת, הוא היה מצוין
      // רק תוודא שה-Form קורא ל-handleAuth החדש הזה.
      <div className="min-h-screen w-full relative flex items-center justify-center p-6 overflow-hidden bg-white" dir="rtl">
        {/* העתק את ה-JSX מהתשובה הקודמת (עם העיצוב הנקי) לכאן */}
        {/* אני מקצר כאן כדי לא להציף, אבל העיקרון הוא השינוי ב-handleAuth */}
          <div className="absolute inset-0 bg-white">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-100 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[400px]"
      >
        {/* Main Card */}
        <div className="bg-white border-[3px] border-black rounded-[24px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 relative z-10">
          
          {/* Header Icon */}
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-md mx-auto transform -rotate-3">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          {/* Titles */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-black mb-2 tracking-tight">
              {mode === 'signup' ? 'מתחילים מכאן' : 'ברוך שובך'}
            </h1>
            <p className="text-gray-500 text-sm font-medium leading-relaxed px-4">
              {mode === 'signup' 
                ? 'כדי לשמור את הבוט שתבנה ולערוך אותו בעתיד, צריך רק הרשמה קצרה.'
                : 'הכנס את הפרטים שלך כדי להמשיך לערוך את הבוט.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            
            <div className="space-y-4">
              <div className="relative group">
                <label className="text-[11px] font-bold text-gray-900 mb-1.5 block uppercase tracking-wider">אימייל</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-black focus:bg-white transition-all text-right placeholder:text-gray-300"
                  placeholder="name@example.com"
                />
              </div>

              <div className="relative group">
                <label className="text-[11px] font-bold text-gray-900 mb-1.5 block uppercase tracking-wider">סיסמה</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-black focus:bg-white transition-all text-right placeholder:text-gray-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white h-12 rounded-xl border-2 border-transparent hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-8 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="font-bold text-sm">
                    {mode === 'signup' ? 'צור חשבון והמשך לבוט' : 'התחבר למערכת'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
           {/* Switch Mode */}
           <div className="mt-6 text-center">
            <button
              type="button" // חשוב כדי לא להגיש את הטופס
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              className="text-xs font-medium text-gray-500 hover:text-black transition-colors"
            >
              {mode === 'signup' ? 'כבר רשום? ' : 'אין לך חשבון? '}
              <span className="font-bold underline decoration-1 underline-offset-2">
                {mode === 'signup' ? 'התחבר כאן' : 'הירשם בחינם'}
              </span>
            </button>
          </div>
        </div>
        
         {/* Back Button */}
        <button 
          onClick={() => router.push('/')}
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

      </motion.div>
      </div>
  );
}

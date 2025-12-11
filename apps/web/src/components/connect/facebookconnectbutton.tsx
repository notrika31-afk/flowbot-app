'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';

const FacebookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 12.0001C23 5.92484 18.0751 1 12 1C5.92484 1 1 5.92484 1 12.0001C1 17.4913 5.0125 22.067 10.2812 22.8943V15.1876H7.4875V12.0001H10.2812V9.57512C10.2812 6.81887 11.9213 5.29387 14.4313 5.29387C15.6338 5.29387 16.8913 5.50949 16.8913 5.50949V8.21574H15.5062C14.1394 8.21574 13.7125 9.06387 13.7125 9.93449V12.0001H16.7625L16.275 15.1876H13.7125V22.8943C18.9875 22.067 23 17.4913 23 12.0001Z" fill="#1877F2"/>
  </svg>
);

interface FacebookConnectButtonProps {
  onSuccess?: (token: string) => void;
}

export const FacebookConnectButton: React.FC<FacebookConnectButtonProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'connected'>('idle');

  const handleConnect = () => {
    setStatus('loading');
    // סימולציה של חיבור - בעתיד כאן יבוא ה-SDK
    setTimeout(() => {
      setStatus('connected');
      if (onSuccess) onSuccess('mock_token_12345');
    }, 2000);
  };

  return (
    <div className="w-full">
      <motion.button
        onClick={handleConnect}
        disabled={status !== 'idle'}
        whileHover={status === 'idle' ? { scale: 1.01, boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" } : {}}
        whileTap={status === 'idle' ? { scale: 0.98, boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" } : {}}
        className={`
          relative w-full group
          flex items-center justify-between
          px-6 py-5
          border-2 border-black rounded-xl
          transition-all duration-200
          ${status === 'connected' ? 'bg-green-50' : 'bg-white'}
          ${status === 'idle' ? 'shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] cursor-pointer' : 'cursor-default'}
        `}
      >
        <div className="flex items-center gap-4">
          <div className={`
            flex items-center justify-center w-12 h-12 rounded-lg border border-black/10
            ${status === 'connected' ? 'bg-green-100' : 'bg-[#F0F2F5]'}
          `}>
            {status === 'loading' ? (
              <Loader2 className="animate-spin text-gray-600" size={24} />
            ) : status === 'connected' ? (
              <CheckCircle2 className="text-green-600" size={26} />
            ) : (
              <FacebookIcon />
            )}
          </div>
          
          <div className="flex flex-col items-start text-right">
            <span className="text-base font-bold text-black">
              {status === 'connected' ? 'החשבון מחובר בהצלחה' : 'חיבור ל-WhatsApp Business'}
            </span>
            <span className="text-sm text-gray-500 font-medium">
              {status === 'connected' 
                ? 'הבוט מוכן לפעולה' 
                : 'באמצעות Meta Embedded Signup'}
            </span>
          </div>
        </div>

        <div className={`
          text-xs font-bold border border-black rounded-full px-4 py-1.5
          ${status === 'connected' ? 'bg-green-500 text-white border-green-700' : 'bg-black text-white'}
        `}>
          {status === 'loading' ? 'מתחבר...' : status === 'connected' ? 'V' : 'התחבר'}
        </div>
      </motion.button>
    </div>
  );
};

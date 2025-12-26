'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { Loader2, CheckCircle2 } from 'lucide-react'; 

// הגדרת הטיפוסים ל-SDK של פייסבוק
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

interface FacebookConnectButtonProps {
  onSuccess?: (token: string) => void;
}

export const FacebookConnectButton: React.FC<FacebookConnectButtonProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle');

  // טעינת ה-SDK של פייסבוק
  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID, // וודא שזה קיים ב-.env שלך
        cookie: true,
        xfbml: true,
        version: "v19.0",
      });
      console.log("Facebook SDK Initialized");
    };
  }, []);

  const handleConnect = () => {
    setStatus('loading');

    // אם ה-SDK עדיין לא נטען
    if (!window.FB) {
      console.error("Facebook SDK not loaded yet");
      setStatus('error');
      return;
    }

    // הפעלת תהליך ה-Embedded Signup
    window.FB.login(
      function (response: any) {
        if (response.authResponse) {
          console.log("Facebook Login Success:", response);
          
          const { accessToken, userID } = response.authResponse;
          
          // --- השינוי הגדול: שליחה לשרת ---
          fetch('/api/integrations/whatsapp/callback', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ accessToken, userID })
          })
          .then(async (res) => {
             if (res.ok) {
                console.log("Bot created successfully!");
                setStatus('connected');
                if (onSuccess) onSuccess(accessToken);
                
                // רענון העמוד כדי שהבוט החדש יופיע מיד
                window.location.reload();
             } else {
                console.error("Server failed to create bot");
                setStatus('error');
             }
          })
          .catch(err => {
             console.error("API Error:", err);
             setStatus('error');
          });

        } else {
          console.log("User cancelled login or did not fully authorize.");
          setStatus('idle');
        }
      },
      {
        // הרשאות חובה
        scope: "whatsapp_business_management, whatsapp_business_messaging",
        extras: {
          feature: "whatsapp_embedded_signup",
          version: 2,
        },
      }
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
      />

      <button
        onClick={handleConnect}
        disabled={status === 'loading' || status === 'connected'}
        className={`
          flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all shadow-sm w-full justify-center
          ${status === 'connected' 
            ? "bg-green-100 text-green-700 border border-green-200 cursor-default"
            : status === 'error'
            ? "bg-red-50 text-red-600 border border-red-200"
            : "bg-[#1877F2] hover:bg-[#166fe5] text-white border border-transparent"
          }
          ${status === 'loading' ? "opacity-70 cursor-wait" : ""}
        `}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>מתחבר לפייסבוק...</span>
          </>
        ) : status === 'connected' ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>וואטסאפ מחובר!</span>
          </>
        ) : (
          <>
            {/* אייקון פייסבוק */}
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>התחבר עם Facebook</span>
          </>
        )}
      </button>

      {status === 'error' && (
        <p className="text-red-500 text-xs">
          אירעה שגיאה בחיבור. נסה שוב.
        </p>
      )}
    </div>
  );
};
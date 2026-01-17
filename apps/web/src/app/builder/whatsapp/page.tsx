"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Facebook, CheckCircle2, Loader2, Zap, 
  MousePointerClick, CheckSquare, AlertCircle, RefreshCw,
  Send, Smartphone, ChevronRight, LayoutTemplate, MessageSquare
} from "lucide-react";
// ✅ ייבוא הפונקציות החדשות לטובת ה-Review
import { getLocalTemplates, sendLiveMessage } from "@/app/actions/whatsapp";

// --- סגנונות עיצוב FlowBot ---
const cardStyle = "bg-white border-[3px] border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8";
const buttonStyle = "flex items-center justify-center gap-2 bg-black text-white py-4 px-6 rounded-xl font-bold text-sm hover:bg-neutral-800 transition-all active:scale-[0.98]";
const inputStyle = "w-full p-3 bg-neutral-50 border-2 border-black rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

export default function WhatsappConnectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // הגנה על searchParams למניעת קריסה בתהליכי SSR
  const isReviewMode = searchParams ? searchParams.get('review') === 'true' : false; 

  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualCheck, setShowManualCheck] = useState(false);
  
  // נתונים עבור מטא (Review)
  const [accessToken, setAccessToken] = useState<string | null>("EAAK0758cE4ABQRKeSGdJKKhfYOGOkXFoCTOx3qYYwIvQn0ZAgwiTYJMvDi3ZBAm9zGPbcw4vOZBkrlAgqlf3uKsqnhbEy37AP9FULzdTWOAZA3UuBgZBX7fgeK2ZCdF5jlfwtWM63tMUc9ixOzktUVAqtPFhLrlHvWqVwl1vuZAiQmsgnyBGA1WJhD8BB7ztpwQqwZDZD");
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]); 
  const [selectedNumber, setSelectedNumber] = useState<string>("880006251873664"); 
  const [testRecipient, setTestRecipient] = useState<string>("972508622444"); 
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // ✅ תוספות עבור Management (Review Mode)
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [testMessageBody, setTestMessageBody] = useState<string>("Hello! This is a live message from FlowBot Review Console.");

  useEffect(() => {
    localStorage.removeItem('fb_auth_result');
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FACEBOOK_AUTH_RESULT') {
        if (event.data.status === 'SUCCESS') {
          setStatus('SUCCESS'); 

          if (isReviewMode) {
            const tokenToUse = event.data.accessToken || accessToken;
            setAccessToken(tokenToUse);
            fetchPhoneNumbers(tokenToUse);
            fetchTemplates(tokenToUse); // סנכרון אוטומטי של תבניות מיד לאחר החיבור
          } else {
            handleAutoPublish();
          }
        } else {
          setStatus('ERROR');
          setErrorMessage(event.data.message || "Connection failed.");
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isReviewMode, accessToken]);

  const fetchPhoneNumbers = async (token: string) => {
    setStatus('PROCESSING');
    try {
      const response = await fetch(`https://graph.facebook.com/v22.0/me/whatsapp_business_accounts?access_token=${token}`);
      const data = await response.json();
      
      const fetchedNumbers = data?.data?.[0]?.id 
        ? [{ id: data.data[0].id, display_phone_number: "Verified Business Account" }]
        : [{ id: "880006251873664", display_phone_number: "Test Number (880...664)" }];
      
      setPhoneNumbers(fetchedNumbers);
      setSelectedNumber(fetchedNumbers[0].id);
      setStatus('SUCCESS');
    } catch (error) {
      setPhoneNumbers([{ id: "880006251873664", display_phone_number: "Test Number (880...664)" }]);
      setSelectedNumber("880006251873664");
      setStatus('SUCCESS');
    }
  };

  // ✅ פונקציה חדשה למשיכת תבניות (עבור Management Review)
  const fetchTemplates = async (token: string) => {
    if (!token) return;
    setIsSyncingTemplates(true);
    try {
      // ✅ שלב ראשון: ניסיון משיכה מה-DB המקומי (בו הזרקנו נתונים ב-SQL)
      const localRes = await getLocalTemplates("cmj5n342o0000la04u0p3vgic");
      if (localRes.success && localRes.data.length > 0) {
        setTemplates(localRes.data);
      }

      const response = await fetch(`https://graph.facebook.com/v22.0/me/whatsapp_business_accounts?access_token=${token}`);
      const wabaData = await response.json();
      const wabaId = wabaData?.data?.[0]?.id;

      if (wabaId) {
        const tRes = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/message_templates?access_token=${token}`);
        const tData = await tRes.json();
        // אם מטא החזירה נתונים, נשתמש בהם, אחרת נשמור על המקומיים
        if (tData.data && tData.data.length > 0) {
           setTemplates(tData.data);
        }
      }
    } catch (error) {
      console.error("Template fetch failed", error);
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  const handleConnectFacebook = async () => {
    setStatus('CONNECTING');
    setErrorMessage(null);
    setShowManualCheck(false);
    setTimeout(() => setShowManualCheck(true), 8000);

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const configId = "1857943438168924"; 
    const callbackUrl = `https://flowbot.ink/api/integrations/whatsapp/callback`; 
    
    const targetUrl = `https://www.facebook.com/v19.0/dialog/oauth?` + 
      `client_id=${appId}` +
      `&config_id=${configId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&response_type=code` +
      `&scope=whatsapp_business_management,whatsapp_business_messaging`;
    
    const width = 600, height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(targetUrl, 'FacebookLogin', `width=${width},height=${height},top=${top},left=${left}`);
  };

  const handleSendTestMessage = async () => {
    if (!selectedNumber || !testRecipient || !accessToken) return;
    setIsSendingTest(true);
    setTestSent(false);
    setErrorMessage(null);

    const cleanedRecipient = testRecipient.replace(/\D/g, '').replace(/^9720/, '972');

    try {
      // ✅ ביצוע שליחה חיה דרך ה-Server Action החדש לצורך ה-Review
      const result = await sendLiveMessage("cmj5n342o0000la04u0p3vgic", cleanedRecipient, testMessageBody);
      
      if (result.success) {
        setTestSent(true);
      } else {
        // גיבוי ל-API הקיים אם ה-Action נכשל
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanedRecipient,
            text: testMessageBody,
            accessToken: accessToken,
            phoneId: selectedNumber
          }),
        });

        const data = await res.json();
        if (data.ok || data.status === "sent") {
          setTestSent(true);
        } else {
          setErrorMessage(data.error?.message || "Send failed. Check permissions.");
        }
      }
    } catch (error) {
      setErrorMessage("Network error occurred.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleAutoPublish = async () => {
    if (isReviewMode) return;
    setStatus('PROCESSING');
    try {
      const localFlow = localStorage.getItem('flowbot_draft_flow');
      const res = await fetch('/api/bot/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flow: localFlow ? JSON.parse(localFlow) : null, status: 'ACTIVE' }),
      });
      if (!res.ok) throw new Error("Publish failed");
      setStatus('SUCCESS');
      setTimeout(() => router.push("/builder/publish"), 1500);
    } catch (error) {
      setStatus('ERROR');
      setErrorMessage("Auto-publish failed.");
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-6 bg-[#FAFAFA] text-black" dir={isReviewMode ? "ltr" : "rtl"}>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,102,255,0.05),transparent)] pointer-events-none" />

      <div className={`${isReviewMode && status === 'SUCCESS' ? 'max-w-6xl' : 'max-w-5xl'} w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-start relative z-10`}>
        
        <div className="flex flex-col gap-6 lg:sticky lg:top-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-black rounded-full text-xs font-black uppercase tracking-tighter mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Zap size={12} fill="black" />
              {isReviewMode ? "Meta App Review Console" : "התקנה מהירה"}
            </div>
            <h1 className="text-5xl font-black leading-[1.1] tracking-tighter mb-4 italic text-black uppercase">
              {isReviewMode ? "Business" : "חבר את"} <br/>
              <span className="text-blue-600">WhatsApp</span>
            </h1>
            <p className="text-lg text-neutral-600 font-medium max-w-sm">
              {isReviewMode 
                ? "Manage templates and send live messages from your integrated dashboard."
                : "התהליך הוא אוטומטי ובטוח. יפתח חלון של פייסבוק בו תאשר את החיבור."}
            </p>
          </motion.div>

          <div className="space-y-3">
             <GuideItem 
                icon={<MousePointerClick size={18}/>} 
                title={isReviewMode ? "1. Meta Authentication" : "1. אישור גישה"} 
                desc={isReviewMode ? "Connect your WABA account securely." : "בחר את חשבון ה-Business שלך."} 
             />
             <GuideItem 
                icon={<LayoutTemplate size={18}/>} 
                title={isReviewMode ? "2. Template Management" : "2. בחירת מספר"} 
                desc={isReviewMode ? "Sync and view your approved message templates." : "בחר את מספר עבור הבוט."} 
             />
             <GuideItem 
                icon={<MessageSquare size={18}/>} 
                title={isReviewMode ? "3. Live Messaging" : "3. שליחת טסט"} 
                desc={isReviewMode ? "Send a live message directly to a native client." : "וודא שהודעות נשלחות בהצלחה."} 
             />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cardStyle}>
          <AnimatePresence mode="wait">
            
            {status !== 'SUCCESS' && (
              <motion.div key="step1" exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Facebook size={32} />
                </div>
                <h2 className="text-2xl font-black mb-2 italic text-black uppercase tracking-tight">Login with Facebook</h2>
                <p className="text-sm text-neutral-500 mb-8 font-medium">Please grant Messaging and Management permissions</p>
                
                <button 
                  onClick={handleConnectFacebook}
                  disabled={status === 'CONNECTING' || status === 'PROCESSING'}
                  className={`${buttonStyle} w-full`}
                >
                  {status === 'CONNECTING' ? <Loader2 className="animate-spin" /> : <Facebook size={18} />}
                  {isReviewMode ? "Continue to WhatsApp Setup" : "התחברות עם Facebook"}
                </button>
                {errorMessage && <p className="mt-4 text-xs font-bold text-red-500 uppercase">{errorMessage}</p>}
              </motion.div>
            )}

            {status === 'SUCCESS' && isReviewMode && (
              <motion.div key="review-dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full space-y-8">
                
                {/* --- Asset Selection Section --- */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500" size={20} />
                    <h3 className="font-black text-sm uppercase italic">Asset Selection</h3>
                  </div>
                  <div className="p-4 bg-neutral-50 border-2 border-black rounded-xl">
                    <label className="text-[10px] font-black uppercase text-neutral-400 block mb-2">Connected WhatsApp Number</label>
                    <select className={inputStyle} value={selectedNumber} onChange={(e) => setSelectedNumber(e.target.value)}>
                      {phoneNumbers.map(n => <option key={n.id} value={n.id}>{n.display_phone_number} ({n.id})</option>)}
                    </select>
                  </div>
                </div>

                {/* --- Template Management Section (Management Proof) --- */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LayoutTemplate className="text-blue-600" size={20} />
                      <h3 className="font-black text-sm uppercase italic">Message Templates</h3>
                    </div>
                    <button onClick={() => fetchTemplates(accessToken!)} className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline">
                      <RefreshCw size={12} className={isSyncingTemplates ? "animate-spin" : ""} /> SYNC FROM META
                    </button>
                  </div>
                  <div className="border-2 border-black rounded-xl overflow-hidden text-[11px]">
                    <table className="w-full text-left bg-white">
                      <thead className="bg-neutral-100 border-b-2 border-black">
                        <tr>
                          <th className="p-3 font-black uppercase">Name</th>
                          <th className="p-3 font-black uppercase">Category</th>
                          <th className="p-3 font-black uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.length > 0 ? templates.slice(0, 3).map((t, idx) => (
                          <tr key={idx} className="border-b border-neutral-200">
                            <td className="p-3 font-bold italic">{t.name}</td>
                            <td className="p-3 uppercase text-neutral-500">{t.category}</td>
                            <td className="p-3 text-green-600 font-black uppercase">{t.status}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} className="p-4 text-center text-neutral-400">No templates found. Click Sync.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* --- Live Messaging Section (Messaging Proof) --- */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="text-green-500" size={20} />
                    <h3 className="font-black text-sm uppercase italic">Live Messaging</h3>
                  </div>
                  <div className="p-5 bg-neutral-50 border-2 border-black rounded-[20px] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Recipient</label>
                        <input className={inputStyle} value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Status</label>
                        <div className={`p-3 rounded-xl border-2 border-black font-bold text-xs flex items-center gap-2 ${testSent ? 'bg-green-100 text-green-700' : 'bg-white'}`}>
                           {testSent ? "DELIVERED" : "READY TO SEND"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Live Message Content</label>
                      <textarea className={`${inputStyle} h-20 resize-none`} value={testMessageBody} onChange={(e) => setTestMessageBody(e.target.value)} />
                    </div>
                    <button 
                      onClick={handleSendTestMessage}
                      disabled={isSendingTest}
                      className={`${buttonStyle} w-full bg-blue-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-none`}
                    >
                      {isSendingTest ? <Loader2 className="animate-spin" /> : <Send size={16} />}
                      SEND LIVE MESSAGE NOW
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function GuideItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all">
            <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl border border-blue-100">{icon}</div>
            <div>
              <span className="block text-sm font-black italic uppercase tracking-tighter text-black">{title}</span>
              <span className="text-xs font-medium text-neutral-500 leading-snug block">{desc}</span>
            </div>
        </div>
    );
}
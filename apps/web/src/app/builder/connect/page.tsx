"use client";

import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot as BotIcon,
  Link2,
  Check as CheckIcon,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Settings,
  FileSpreadsheet,
  Webhook,     // Make
  CreditCard,  // Payments / Stripe
  Video,       // Zoom
  Users,       // HubSpot
  Zap,         // Zapier
  Globe        // Site
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// ייבוא הקבועים שלך - לא נגעתי
import {
  PROVIDERS,
  PROVIDER_GROUPS,
  type ProviderSlug,
  type IntegrationStatusValue,
  type ProviderConfig,
} from "@/lib/integrations/providers";

/* ---------- Animations ---------- */
const fade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// אנימציה מותאמת: בנייד זה עולה מלמטה, במחשב זה קופץ במרכז
const modalAnim = {
  hidden: { opacity: 0, y: "100%", scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { opacity: 0, y: "100%", transition: { duration: 0.2 } },
};

/* ---------- Types ---------- */
type IntegrationRecord = {
  id: string;
  provider: string;
  status: IntegrationStatusValue;
  metadata?: Record<string, any>;
  updatedAt: string;
};

type IntegrationsMap = Partial<Record<string, IntegrationRecord>>;

type ConnectFlags = {
  calendar: boolean;
  payments: boolean;
  site: boolean;
  integrations: boolean;
};

interface IntegrationsContext {
  loading: boolean;
  integrations: IntegrationsMap;
  error: string | null;
  connectFlags: ConnectFlags;
  actionProvider: ProviderSlug | null;
  setActionProvider: Dispatch<SetStateAction<ProviderSlug | null>>;
  loadIntegrations: (showLoader?: boolean) => Promise<void>;
  handleDisconnect: (slug: ProviderSlug) => Promise<void>;
  startOAuth: (slug: ProviderSlug) => Promise<void>;
  toast: { message: string; type: 'success' | 'error' } | null;
  setToast: Dispatch<SetStateAction<{ message: string; type: 'success' | 'error' } | null>>;
}

/* =========================================================
 * INTEGRATIONS MANAGER (LOGIC - REAL API CONNECTION)
 * ======================================================= */
function useIntegrationsManager(): IntegrationsContext {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationsMap>({});
  const [error, setError] = useState<string | null>(null);
  const [actionProvider, setActionProvider] = useState<ProviderSlug | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [connectFlags, setConnectFlags] = useState<ConnectFlags>({
    calendar: false,
    payments: false,
    site: false,
    integrations: false,
  });

  const searchParams = useSearchParams();
  const router = useRouter();

  const loadIntegrations = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/integrations", { method: "GET" });
      
      if (!res.ok) {
        throw new Error("שגיאה בטעינת הנתונים מהשרת");
      }

      const data = await res.json();
      const rawIntegrations = data.integrations || {};

      const normalizedIntegrations: IntegrationsMap = {};
      
      Object.values(rawIntegrations).forEach((record: any) => {
          normalizedIntegrations[record.provider] = record;
          const config = Object.values(PROVIDERS).find(p => p.provider === record.provider);
          if (config) {
              normalizedIntegrations[config.slug] = record;
          }
      });

      setIntegrations(normalizedIntegrations);
      
    } catch (err) {
      console.error(err);
      setError("לא הצלחנו לטעון את החיבורים שלך. נסה לרענן.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(async (slug: ProviderSlug) => {
    if(!confirm("האם אתה בטוח שברצונך לנתק חיבור זה?")) return;

    setActionProvider(slug);
    const providerEnum = PROVIDERS[slug]?.provider || slug;

    const prevIntegrations = { ...integrations };
    setIntegrations((prev) => {
      const next = { ...prev };
      delete next[slug];
      delete next[providerEnum];
      return next;
    });

    try {
      const res = await fetch("/api/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerEnum }),
      });

      if (!res.ok) throw new Error("Failed to disconnect");
      
      setToast({ message: "החיבור בוטל בהצלחה", type: "success" });
      await loadIntegrations(false);

    } catch (e) {
      console.error(e);
      setIntegrations(prevIntegrations);
      setToast({ message: "שגיאה בניתוק החיבור", type: "error" });
    } finally {
      setActionProvider(null);
    }
  }, [integrations, loadIntegrations]);

  const startOAuth = useCallback(async (slug: ProviderSlug) => {
     setActionProvider(slug);
     try {
       console.log("Starting OAuth flow for:", slug);
       window.location.href = `/api/auth/${slug}/login`;
     } catch (e) {
       console.error("OAuth Navigation Error:", e);
       setToast({ message: "שגיאה באתחול החיבור", type: "error" });
       setActionProvider(null);
     }
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setToast({ message: "המערכת חוברה בהצלחה!", type: "success" });
      loadIntegrations(false);
      router.replace("/builder/connect");
    }

    if (searchParams.get("error")) {
      const errType = searchParams.get("error");
      let msg = "אירעה שגיאה בחיבור הספק";
      if (errType === "google_rejected") msg = "החיבור נדחה על ידי גוגל";
      if (errType === "internal_error") msg = "שגיאת שרת פנימית";
      
      setToast({ message: msg, type: "error" });
      router.replace("/builder/connect");
    }
  }, [searchParams, loadIntegrations, router]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return {
    loading,
    integrations,
    error,
    connectFlags,
    actionProvider,
    setActionProvider,
    loadIntegrations,
    handleDisconnect,
    startOAuth,
    toast,
    setToast
  };
}

/* =========================================================
 * MAIN PAGE COMPONENT
 * ======================================================= */

export default function ConnectPage() {
  const manager = useIntegrationsManager();
  const {
    loading,
    integrations,
    error,
    actionProvider,
    setActionProvider,
    loadIntegrations,
    handleDisconnect,
    startOAuth,
    toast,
    setToast
  } = manager;

  const [manualProvider, setManualProvider] = useState<ProviderSlug | null>(null);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const openManualProvider = useCallback(
    (slug: ProviderSlug) => {
      const provider = PROVIDERS[slug];
      if (!provider.manualFields?.length) return;
      
      setManualValues({});
      setManualProvider(slug);
      setFormError(null);
    },
    []
  );

  const handleManualSubmit = useCallback(
    async (slug: ProviderSlug) => {
      setFormError(null);
      setActionProvider(slug);

      const providerEnum = PROVIDERS[slug]?.provider || slug;

      try {
        const res = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: providerEnum,
            metadata: manualValues,
            status: "CONNECTED",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "שגיאה בשמירה");
        }

        await loadIntegrations(false);
        setManualProvider(null);
        setToast({ message: "הגדרות נשמרו בהצלחה", type: "success" });
      } catch (e: any) {
        console.error(e);
        setFormError(e.message || "אירעה שגיאה בשמירת החיבור");
      } finally {
        setActionProvider(null);
      }
    },
    [manualValues, setActionProvider, loadIntegrations, setToast]
  );

  return (
    <main className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans pb-20 md:pb-0" dir="rtl">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-6 left-1/2 z-[60] flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl text-sm font-bold w-[90%] max-w-sm justify-center whitespace-nowrap
              ${toast.type === 'success' ? 'bg-black text-white' : 'bg-rose-500 text-white'}
            `}
          >
            {toast.type === 'success' ? <CheckIcon size={16} /> : <X size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-12">
        
        {/* Header - מותאם מובייל */}
        <header className="mb-6 md:mb-8 flex flex-col gap-4">
          <div className="flex flex-col-reverse md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
               {/* לחצן חזרה גדול ונגיש */}
               <Link href="/builder" className="hover:text-slate-800 transition-colors flex items-center gap-2 text-sm text-slate-500 py-1 w-fit">
                   <div className="p-1 rounded-full bg-slate-100"><ArrowRight size={14} /></div>
                   חזרה לעריכת הבוט
               </Link>
               <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                 מערכות וחיבורים
               </h1>
               <p className="text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
                 כאן מחברים את ה"מוח" של הבוט ליומן, לסליקה ולאתר שלך.
                 <br/>
                 <span className="text-xs text-slate-400">הבוט ידע לבדוק זמינות ולקבוע תורים אוטומטית ברגע שהחיבור פעיל.</span>
               </p>
            </div>

            <Link
              href="/builder/whatsapp"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 md:py-3 font-bold text-sm shadow-lg transition-all bg-black text-white hover:bg-slate-800 hover:shadow-xl active:scale-95 w-full md:w-auto"
            >
              המשך לחיבור וואטסאפ
              <ArrowLeft size={16} />
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="space-y-4 md:space-y-6">
           
           {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2 animate-pulse">
                <X size={16} />
                {error}
              </div>
            )}

           {loading ? (
             <IntegrationSkeleton />
           ) : (
             <div className="grid gap-4 md:gap-6">
                {PROVIDER_GROUPS.map((group) => (
                   <motion.section
                      key={group.key}
                      variants={fade}
                      initial="hidden"
                      animate="show"
                      className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm"
                   >
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-1">
                         <div>
                            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                                {(group.key as string) === 'calendar' && <Calendar className="w-5 h-5 text-indigo-500" />}
                                {(group.key as string) === 'data' && <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
                                {(group.key as string) === 'integrations' && <Zap className="w-5 h-5 text-orange-500" />}
                                {(group.key as string) === 'automation' && <Webhook className="w-5 h-5 text-purple-500" />}
                                {(group.key as string) === 'payments' && <CreditCard className="w-5 h-5 text-blue-500" />}
                                {(group.key as string) === 'site' && <Globe className="w-5 h-5 text-cyan-500" />}
                                {group.title}
                            </h2>
                            <p className="text-xs md:text-sm text-slate-500 mt-1">{group.description}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {group.providerSlugs.map((slug) => {
                          const provider = PROVIDERS[slug];
                          if (!provider) return null;
                          
                          const record = integrations[slug] || integrations[provider.provider];
                          const isConnected = record?.status === "CONNECTED";
                          const isLoadingAction = actionProvider === slug;

                          return (
                            <ProviderCard
                              key={slug}
                              provider={provider}
                              loading={isLoadingAction}
                              isConnected={isConnected}
                              onConnect={() => {
                                if (provider.mode === "oauth") startOAuth(slug);
                                else if (provider.mode === "manual") openManualProvider(slug);
                              }}
                              onDisconnect={() => handleDisconnect(slug)}
                            />
                          );
                        })}
                      </div>
                   </motion.section>
                ))}
             </div>
           )}
        </div>

        {/* Manual provider sheet */}
        <Sheet
          show={!!manualProvider}
          onClose={() => setManualProvider(null)}
          title={`הגדרות ${manualProvider ? PROVIDERS[manualProvider].name : ""}`}
        >
          {manualProvider && (
            <ManualIntegrationForm
              provider={PROVIDERS[manualProvider]}
              values={manualValues}
              onChange={(name, value) =>
                setManualValues((prev) => ({ ...prev, [name]: value }))
              }
              onSubmit={() => handleManualSubmit(manualProvider)}
              loading={actionProvider === manualProvider}
              error={formError}
            />
          )}
        </Sheet>
      </div>
    </main>
  );
}

/* =========================================================
 * HELPER COMPONENTS
 * ======================================================= */

function ProviderCard({
  provider,
  loading,
  isConnected,
  onConnect,
  onDisconnect,
}: {
  provider: ProviderConfig;
  loading: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const buttonContent = isConnected ? "מחובר" : provider.mode === "manual" ? "הגדר ידנית" : "התחבר";
  
  const connectButtonClass = isConnected 
    ? "bg-green-500 text-white hover:bg-green-600 ring-2 ring-green-100" 
    : "bg-black text-white hover:bg-slate-800 active:scale-[0.98]";

  return (
    <div
      className={`relative flex flex-col justify-between p-4 md:p-5 rounded-xl transition-all duration-200
        ${isConnected 
           ? "bg-white border-2 border-green-500/20 shadow-md ring-0" 
           : "bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-md"
        }
      `}
    >
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
           <div className={`p-2 rounded-lg border shadow-sm transition-colors
             ${isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-slate-700 border-slate-100"}
           `}>
               {provider.slug === 'make' ? <Webhook size={20}/> : 
                provider.slug === 'zapier' ? <Zap size={20}/> :
                provider.slug === 'zoom' ? <Video size={20}/> :
                provider.slug === 'hubspot' ? <Users size={20}/> :
                (provider.slug === 'stripe' || provider.slug === 'paypal' || provider.slug === 'paybox') ? <CreditCard size={20}/> :
                provider.slug === 'site-link' ? <Globe size={20}/> :
                provider.slug === 'google-sheets' ? <FileSpreadsheet size={20}/> :
                provider.slug === 'google-calendar' ? <Calendar size={20}/> :
                <Link2 size={20} />}
           </div>
           {isConnected && (
             <div className="bg-green-100 text-green-700 p-1 px-2 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1">
               <CheckIcon size={10} strokeWidth={4} />
               פעיל
             </div>
           )}
        </div>
        
        <h3 className="font-bold text-slate-900 mb-1 text-sm md:text-base">{provider.name}</h3>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 h-8">{provider.description}</p>
      </div>

      <div className="mt-auto pt-2">
         {provider.mode === "coming-soon" ? (
            <button disabled className="w-full py-2 bg-slate-100 text-slate-400 text-xs font-medium rounded-xl cursor-not-allowed">
               בקרוב
            </button>
         ) : (
           <div className="flex gap-2 h-9 md:h-10">
              <button 
                 onClick={isConnected ? undefined : onConnect}
                 disabled={loading || isConnected}
                 className={`flex-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm
                    ${connectButtonClass}
                    ${isConnected ? 'cursor-default opacity-100' : ''}
                 `}
              >
                 {loading && <Loader2 size={12} className="animate-spin" />}
                 {buttonContent}
              </button>
              
              {isConnected && (
                 <button 
                    onClick={onDisconnect}
                    className="px-3 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors flex items-center justify-center gap-1 active:scale-95"
                    title="נתק חיבור"
                 >
                    <X size={14} />
                    <span className="sr-only">נתק</span>
                 </button>
              )}
           </div>
         )}
      </div>
    </div>
  );
}

// =========================================================
// IntegrationSkeleton
// =========================================================
function IntegrationSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse">
           <div className="h-6 w-48 bg-slate-200 rounded mb-6" />
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(j => (
                 <div key={j} className="h-40 bg-slate-100 rounded-xl" />
              ))}
           </div>
        </div>
      ))}
    </div>
  );
}

// =========================================================
// ManualIntegrationForm
// =========================================================
function ManualIntegrationForm({
  provider,
  values,
  onChange,
  onSubmit,
  loading,
  error,
}: {
  provider: ProviderConfig;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-100">
         הזן פרטים עבור <strong>{provider.name}</strong>.
      </div>
      
      <div className="space-y-4">
        {provider.manualFields?.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{field.label}</label>
            <input
              value={values[field.name] || ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              type={field.type}
              // text-base מונע זום אוטומטי במובייל באייפון
              className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-base md:text-sm focus:border-black focus:ring-0 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-rose-600 font-medium bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</div>}

      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full bg-black text-white h-12 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          שמור חיבור
        </button>
      </div>
    </div>
  );
}

// =========================================================
// Sheet (Mobile Drawer / Desktop Modal)
// =========================================================
function Sheet({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: ReactNode; }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            variants={modalAnim}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative w-full sm:w-[500px] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-t sm:border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0">
              <h3 className="text-lg font-black text-slate-900">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-900"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto pb-10 sm:pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
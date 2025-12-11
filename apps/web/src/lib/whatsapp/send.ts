// fix vercel build
import { env } from "@/lib/config/env";

export async function sendWhatsappMfaCode(toPhone: string, code: string) {
  // אם אין הגדרות, נרשום בלוג ונדלג (כדי לא לשבור את הבנייה)
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn("⚠️ WhatsApp API not configured, printing code to console instead:", code);
    return true; 
  }

  const url = `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const res = await fetch(url, {
        method: "POST",
        headers: {
        "Authorization": `Bearer ${env.WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: toPhone.replace(/\D/g, ""),
            type: "text",
            text: { body: `קוד האימות שלך ל-FlowBot הוא: ${code}` }
        })
    });

    if (!res.ok) {
        console.error("❌ WhatsApp MFA Failed:", await res.text());
        return false;
    }
    
    return true;
  } catch (e) {
      console.error("❌ Network Error:", e);
      return false;
  }
}
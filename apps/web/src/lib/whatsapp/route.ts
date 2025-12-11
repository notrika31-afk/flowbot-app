// lib/whatsapp/send.ts
import { env } from "@/lib/config/env";

export async function sendWhatsappMfaCode(toPhone: string, code: string) {
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error("❌ WhatsApp API not configured");
    return false;
  }

  const url = `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: toPhone.replace(/\D/g, ""), // ניקוי כל תווים שאינם מספר
    type: "template",
    template: {
      name: env.WHATSAPP_MFA_TEMPLATE_NAME || "flowbot_mfa_code",
      language: { code: "he" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: code }
          ]
        }
      ]
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.WHATSAPP_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("❌ WhatsApp MFA SEND ERROR:", data);
    return false;
  }

  console.log("📩 MFA sent via WhatsApp:", data);
  return true;
}
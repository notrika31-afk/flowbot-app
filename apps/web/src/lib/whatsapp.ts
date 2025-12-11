// apps/web/src/lib/whatsapp.ts
import { env } from "@/lib/config/env";

const WHATSAPP_GRAPH_BASE = "https://graph.facebook.com/v21.0";

type SendTextOptions = {
  to: string;   // מספר הלקוח, למשל "9725xxxxxxxx"
  body: string; // תוכן ההודעה
};

export async function sendWhatsAppText({ to, body }: SendTextOptions) {
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn("WhatsApp not configured – missing token or phone number id");
    throw new Error("WHATSAPP_NOT_CONFIGURED");
  }

  const url = `${WHATSAPP_GRAPH_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("WhatsApp send error:", res.status, text);
    throw new Error("WHATSAPP_SEND_FAILED");
  }

  const json = await res.json().catch(() => null);
  return json;
}
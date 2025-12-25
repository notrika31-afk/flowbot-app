import { env } from "@/lib/config/env";

const WHATSAPP_GRAPH_BASE = "https://graph.facebook.com/v21.0";

type SendTextOptions = {
  to: string;           // מספר הלקוח
  body: string;         // תוכן ההודעה
  phoneNumberId: string; // המזהה של העסק השולח
  accessToken: string;   // הטוקן של העסק השולח
};

export async function sendWhatsAppText({ to, body, phoneNumberId, accessToken }: SendTextOptions) {
  // בדיקת תקינות בסיסית
  if (!phoneNumberId || !accessToken) {
    console.error("❌ WhatsApp Send Error: Missing credentials");
    throw new Error("WHATSAPP_MISSING_CREDENTIALS");
  }

  const url = `${WHATSAPP_GRAPH_BASE}/${phoneNumberId}/messages`;

  console.log(`📤 Sending WhatsApp to ${to} via ${phoneNumberId}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { body: body },
    }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error("❌ WhatsApp API Error:", res.status, errorData);
    throw new Error(`WHATSAPP_SEND_FAILED: ${errorData}`);
  }

  const json = await res.json();
  return json;
}
import crypto from "crypto";

const STATE_SECRET =
  process.env.INTEGRATIONS_STATE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "flowbot-integrations-dev-secret";

export type IntegrationStatePayload = {
  provider: string;
  userId: string;
  redirectTo?: string;
};

export function encodeState(payload: IntegrationStatePayload) {
  const json = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", STATE_SECRET).update(json).digest("hex");
  const packed = `${json}::${hmac}`;
  return Buffer.from(packed).toString("base64url");
}

export function decodeState(state?: string | null): IntegrationStatePayload | null {
  if (!state) return null;
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const [json, hmac] = raw.split("::");
    if (!json || !hmac) return null;
    const expected = crypto.createHmac("sha256", STATE_SECRET).update(json).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))) {
      return null;
    }
    return JSON.parse(json) as IntegrationStatePayload;
  } catch {
    return null;
  }
}

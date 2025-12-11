// src/lib/flow.ts

export type Button = { label: string; go?: string };
export type Step =
  | { id: string; type: "start" | "message" | "ai" | "end"; title: string; content?: string; next?: string }
  | { id: string; type: "buttons"; title: string; buttons: Button[]; next?: string }
  | { id: string; type: "condition" | "delay" | "http"; title: string; content?: string; next?: string };

export type Flow = {
  goal: string;
  business?: {
    name?: string;
    category?: string;
    services?: string[];
    tone?: "רשמי" | "חברי" | "קליל";
    booking?: boolean;
    payments?: boolean;
    hours?: string;
  };
  triggers?: { intent: string; keywords: string[] }[];
  steps: Step[];
};

export function safeParseFlow(raw: string): Flow | null {
  // נסה לתפוס ```json ... ``` או פשוט JSON נקי
  const fence = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonText = fence ? fence[1] : raw.trim();

  try {
    const obj = JSON.parse(jsonText);
    if (isValidFlow(obj)) return obj;
    return null;
  } catch {
    return null;
  }
}

export function isValidFlow(x: any): x is Flow {
  if (!x || typeof x !== "object") return false;
  if (!Array.isArray(x.steps)) return false;
  if (typeof x.goal !== "string") return false;
  return true;
}

// מיפוי טריגרים בסיסי לפי תחום – אפשר להרחיב
export function defaultTriggerPack(category = ""): Flow["triggers"] {
  const c = category.toLowerCase();
  if (c.includes("כושר") || c.includes("חדר")) {
    return [
      { intent: "booking", keywords: ["להירשם", "להצטרף", "אימון", "לקבוע"] },
      { intent: "pricing", keywords: ["מחיר", "עלות", "תעריף"] },
      { intent: "info", keywords: ["מידע", "שעות", "כתובת"] },
    ];
  }
  if (c.includes("ג׳ל") || c.includes("לק")) {
    return [
      { intent: "booking", keywords: ["תור", "לקבוע", "הזמנה"] },
      { intent: "pricing", keywords: ["מחיר", "עלות", "מבצע"] },
      { intent: "portfolio", keywords: ["דוגמאות", "תמונות", "עבודות"] },
    ];
  }
  return [
    { intent: "booking", keywords: ["לקבוע", "להזמין", "תור"] },
    { intent: "pricing", keywords: ["מחיר", "עלות", "תמחור"] },
    { intent: "info", keywords: ["מידע", "שעות", "כתובת"] },
  ];
}

// התאמת הודעת משתמש ל-intent לפי המילים מהטריגרים
export function detectIntentFromText(text: string, triggers?: Flow["triggers"]): string | null {
  if (!triggers?.length) return null;
  const t = text.toLowerCase();
  for (const pack of triggers) {
    if (pack.keywords.some((k) => t.includes(k.toLowerCase()))) return pack.intent;
  }
  return null;
}

// הרצה נאיבית של ה-Flow לפי intent או next
export function walkFlow(flow: Flow, intent?: string): string[] {
  const map = new Map(flow.steps.map((s) => [s.id, s]));
  let node = flow.steps.find((s) => s.type === "start") || flow.steps[0];
  const out: string[] = [];

  const pushNode = (n: Step) => {
    out.push(`🔹 ${n.title} (${(n as any).type})`);
    if ("content" in n && n.content) out.push(n.content);
    if ("buttons" in n && n.buttons?.length) {
      out.push("כפתורים: " + n.buttons.map((b) => `"${b.label}"`).join(", "));
    }
  };

  // אם יש intent, נסה לקפוץ לצומת מתאים
  if (intent) {
    const candidate =
      flow.steps.find((s: any) => s.type === "buttons" && s.buttons?.some((b: Button) => (b.go || "").includes(intent))) ||
      flow.steps.find((s: any) => (s.id || "").includes(intent));
    if (candidate) node = candidate;
  }

  let guard = 0;
  while (node && guard++ < 30) {
    pushNode(node);
    if (!("next" in node) || !node.next) break;
    node = map.get(node.next) as Step;
  }
  return out;
}
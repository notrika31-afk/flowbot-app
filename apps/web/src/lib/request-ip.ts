// apps/web/src/lib/request-ip.ts

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // לפעמים מגיע משהו כמו: "1.1.1.1, 2.2.2.2"
    const ip = xff.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // בסביבה מקומית – הכול 127.0.0.1 וזה בסדר
  return "127.0.0.1";
}
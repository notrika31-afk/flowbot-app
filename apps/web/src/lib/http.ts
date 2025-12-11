import type { NextRequest } from "next/server";

export function getBaseUrl(req?: NextRequest) {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const proto =
    req?.headers.get("x-forwarded-proto") ||
    (req?.headers.get("host")?.includes("localhost") ? "http" : "https");
  const host =
    req?.headers.get("x-forwarded-host") ||
    req?.headers.get("host") ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3001";

  if (host.startsWith("http")) return host;
  return `${proto}://${host}`;
}

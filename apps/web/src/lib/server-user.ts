import type { NextRequest } from "next/server";

export function resolveUserId(req?: NextRequest): string {
  const fromHeader = req?.headers.get("x-user-id") || req?.headers.get("x-user");
  return fromHeader || process.env.DEMO_USER_ID || "demo-user";
}

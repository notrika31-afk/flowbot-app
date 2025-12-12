import { NextResponse } from 'next/server';
import { scrapeUrlDeep } from '@/lib/scraper';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // מאפשר לסריקה לרוץ עד 60 שניות (Vercel/Next)

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const data = await scrapeUrlDeep(url);

    if (!data) {
        // גם אם נכשלנו, מחזירים תשובה תקינה כדי שהפרונט לא יקרוס
        return NextResponse.json({ success: false, message: "Failed to scrape" });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Scrape API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
  }
}
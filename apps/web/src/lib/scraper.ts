import * as cheerio from 'cheerio';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

export interface ScrapedData {
  url: string;
  title: string;
  description: string;
  rawContent: string;
}

// --- פונקציות עזר ---

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
}

function isValuableLink(href: string, currentHost: string): boolean {
  try {
    const url = new URL(href, currentHost);
    if (url.hostname !== new URL(currentHost).hostname) return false;
    const path = url.pathname.toLowerCase();
    
    if (path.match(/\/(login|cart|account|register|wishlist|checkout|policy|terms|legal|wp-admin|auth|feed|xml|json|signin|signup)/)) return false;
    if (path === '/' || path === '') return false;
    if (path.match(/\/(shop|store|product|item|collection|category|service|pricing|price|menu|ofer|catalog|about|contact|booking|appointment)/)) return true;
    if (path.split('/').length > 2) return true;
    return false;
  } catch (e) { return false; }
}

async function fetchHtmlFallback(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlowBotScanner/2.0)' },
            next: { revalidate: 0 },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        return await response.text();
    } catch (e) { return null; }
}

// --- הסורק הראשי ---

export async function scrapeUrlDeep(url: string): Promise<ScrapedData | null> {
  console.log(`\n--- STARTING SCAN: ${url} ---`);
  
  let finalRawContent = "";
  let pageTitle = "Site Scan";
  let pageDesc = "";
  let firecrawlSuccess = false;

  // 1. ניסיון Firecrawl (API ישיר)
  if (FIRECRAWL_API_KEY) {
      try {
          console.log("[Deep Scraper] 🚀 Sending DIRECT request to Firecrawl API...");
          
          const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${FIRECRAWL_API_KEY}`
              },
              body: JSON.stringify({
                  url: url,
                  pageOptions: {
                      onlyMainContent: false, 
                      includeHtml: true,     
                      waitFor: 6000 // ניתן לו אקסטרה זמן (6 שניות) ליתר ביטחון
                  }
              })
          });

          if (response.ok) {
              const json = await response.json();
              
              if (json.success && json.data && json.data.html) {
                  console.log("[Deep Scraper] ✅ Firecrawl Success! Processing HTML...");
                  firecrawlSuccess = true;
                  
                  const $ = cheerio.load(json.data.html);
                  
                  pageTitle = json.data.metadata?.title || $('title').text().trim();
                  pageDesc = json.data.metadata?.description || $('meta[name="description"]').attr('content') || "";
                  
                  // --- שלב א: חילוץ נתונים מובנים (JSON-LD) ---
                  // זה המקור הכי אמין למחירים. נאסוף את כולם.
                  $('script[type="application/ld+json"]').each((_, el) => {
                     const raw = $(el).html();
                     if (raw) {
                         // מנקים רווחים כדי לחסוך מקום
                         const minified = raw.replace(/\s+/g, ' ').slice(0, 5000);
                         finalRawContent += `\n[HIDDEN DATA]: ${minified}\n`;
                     }
                  });

                  // --- שלב ב: צייד המחירים והוריאציות (Visual Extraction) ---
                  // עוברים על אלמנטים שחשודים כמחיר או כפתור בחירה
                  let extractedPrices: string[] = [];
                  let extractedVariants: string[] = [];

                  // 1. חיפוש מחירים
                  $('*').each((_, el) => {
                      // מתעלמים מאלמנטים לא רלוונטיים
                      if ($(el).is('script, style, noscript, svg, path')) return;
                      
                      // בדיקה אם יש טקסט ישיר באלמנט (ולא בילדים שלו)
                      const directText = $(el).contents().filter((_, c) => c.type === 'text').text().trim();
                      
                      if (directText) {
                          // זיהוי תבנית מחיר (₪100, 100 ש"ח, 100.00 NIS)
                          if (/(\₪|NIS|ש"ח|\$|€)\s?\d+/.test(directText) || /\d+\s?(\₪|NIS|ש"ח|\$|€)/.test(directText)) {
                              if (directText.length < 30) { // סינון פסקאות ארוכות שמכילות מחיר
                                  extractedPrices.push(`[PRICE FOUND]: ${directText}`);
                              }
                          }
                          // זיהוי וריאציות (צבע/מידה)
                          if (/^(צבע|מידה|Color|Size|Select):?$/i.test(directText)) {
                               // מנסים לקחת את האחים או הילדים של האלמנט הזה
                               const options = $(el).parent().find('option, li, button, span').map((_, opt) => $(opt).text().trim()).get().join(', ');
                               if (options.length > 0) extractedVariants.push(`[VARIANT: ${directText}]: ${options}`);
                          }
                      }
                  });

                  // הוספת הממצאים לתוכן
                  if (extractedPrices.length > 0) finalRawContent += `\n=== VISUAL PRICES ===\n${[...new Set(extractedPrices)].join('\n')}\n`;
                  if (extractedVariants.length > 0) finalRawContent += `\n=== VISUAL VARIANTS ===\n${[...new Set(extractedVariants)].join('\n')}\n`;

                  // --- שלב ג: טקסט כללי (Visual Content) ---
                  $('script, style, nav, footer, iframe, svg, noscript').remove();
                  finalRawContent += `\n[PAGE TEXT]:\n${clean($('body').text()).slice(0, 50000)}`;
              }
          }
      } catch (e: any) {
          console.error(`[Deep Scraper] Firecrawl Failed:`, e.message);
      }
  }

  // 2. גיבוי (אם Firecrawl נכשל או לא מצא כלום)
  if (!firecrawlSuccess) {
      console.log("[Deep Scraper] Using Backup Scraper...");
      const html = await fetchHtmlFallback(url);
      if (html) {
          const $ = cheerio.load(html);
          pageTitle = $('title').text().trim();
          
          // חילוץ בסיסי לגיבוי
          $('script, style').remove();
          finalRawContent += `\n[BACKUP SCAN]:\n${clean($('body').text().slice(0, 5000))}`;
          
          // סריקת לינקים פנימיים מהירה
          const internalLinks = new Set<string>();
          $('a[href]').each((_, el) => {
              const href = $(el).attr('href');
              if (href && isValuableLink(href, url)) {
                  try { internalLinks.add(new URL(href, url).toString()); } catch(e) {}
              }
          });
          
          const linksToScan = Array.from(internalLinks).slice(0, 3);
          const subPages = await Promise.all(linksToScan.map(async (link) => {
              const subHtml = await fetchHtmlFallback(link);
              if (!subHtml) return "";
              const $sub = cheerio.load(subHtml);
              $sub('script, style').remove();
              return `--- PAGE: ${$sub('title').text()} ---\n${clean($sub('body').text().slice(0, 2000))}`;
          }));
          finalRawContent += `\n\n${subPages.join('\n\n')}`;
      }
  }

  return {
      url,
      title: pageTitle,
      description: pageDesc,
      rawContent: finalRawContent.slice(0, 150000)
  };
}
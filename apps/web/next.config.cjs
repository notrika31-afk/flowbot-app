/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

// CSP לסביבת פיתוח – קצת יותר גמיש בגלל HMR וכו'
const DEV_CSP = [
  "default-src 'self';",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;",
  "style-src 'self' 'unsafe-inline';",
  "img-src 'self' data: blob:;",
  "font-src 'self' data:;",
  "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 ws://localhost:3000 ws://127.0.0.1:3000 https://api.openai.com;",
  "frame-ancestors 'none';",
  "base-uri 'self';",
  "form-action 'self';",
].join(" ");

// CSP לסביבת PROD – הרבה יותר הדוק
const PROD_CSP = [
  "default-src 'self';",
  "script-src 'self';",
  "style-src 'self' 'unsafe-inline';",
  "img-src 'self' data: blob:;",
  "font-src 'self' data:;",
  "connect-src 'self' https://api.openai.com https://flowbot.ai;",
  "frame-ancestors 'none';",
  "base-uri 'self';",
  "form-action 'self';",
].join(" ");

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    const csp = isProd ? PROD_CSP : DEV_CSP;

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            // חוסם מצלמה/מיקרופון/מיקום/תשלום כברירת מחדל
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

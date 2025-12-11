// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ההגדרה הקריטית: פותרת בעיות ייבוא של Prisma ו-node_modules ב-Vercel
  output: 'standalone', 

  // כאן אפשר להוסיף הגדרות נוספות אם יש צורך (כגון env, images, וכו')
  // לדוגמה:
  // env: {
  //   CUSTOM_VAR: process.env.CUSTOM_VAR,
  // },
};

module.exports = nextConfig;
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/**/*.{js,ts,jsx,tsx,mdx}",
    "../../components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oceanDeep: "#051822",
        oceanMint: "#2F9D8F",
        oceanTeal: "#186F5E",
        sandDark: "#563B27",
        sandMid: "#A56238",
        sandLight: "#C48E5C",
      },
      backgroundImage: {
        oceanGradient: "linear-gradient(135deg, #051822, #186F5E)",
      },
      boxShadow: {
        glass: "0 4px 30px rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [],
};
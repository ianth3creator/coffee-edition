/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: "#3b2f2f",
        latte: "#d2b48c",
        fog: "#cbbca3",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        impact: ["Anton", "sans-serif"],
        glitch: ["Orbitron", "sans-serif"],
        retro: ["'Press Start 2P'", "monospace"],
      },
    },
  },
  plugins: [],
};

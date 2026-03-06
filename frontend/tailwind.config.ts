import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Jarvis brand palette
        navy: {
          DEFAULT: "#0A1628",
          50: "#E8EBF0",
          100: "#C5CDD9",
          200: "#8FA0B8",
          300: "#5A7397",
          400: "#2D4F7A",
          500: "#0A1628",
          600: "#081221",
          700: "#060D19",
          800: "#040910",
          900: "#020408",
        },
        blue: {
          electric: "#1A73E8",
          DEFAULT: "#1A73E8",
        },
        cyan: {
          accent: "#00BCD4",
          neon: "#00E5FF",
          DEFAULT: "#00BCD4",
        },
        slate: {
          body: "#2D3748",
        },
        light: {
          grey: "#E2E8F0",
        },
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "jarvis-gradient": "linear-gradient(135deg, #0A1628 0%, #1A2942 100%)",
      },
      keyframes: {
        "pulse-cyan": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 188, 212, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0, 188, 212, 0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-cyan": "pulse-cyan 2s infinite",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

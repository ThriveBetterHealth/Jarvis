import type { Config } from "tailwindcss";

// Helper that lets Tailwind generate opacity-modifier variants (e.g. bg-electric-blue/20)
// by exposing the colour as an RGB channel string via a CSS variable.
function withOpacity(variableName: string) {
  return ({ opacityValue }: { opacityValue?: string | number }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

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
        // Static shades (no opacity modifier needed — used for bg/text solid colours)
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
        // Dynamic colours — defined via CSS RGB variables so /20, /50 etc. work
        "electric-blue": withOpacity("--color-electric-blue-rgb"),
        "cyan-accent": withOpacity("--color-cyan-accent-rgb"),
        "neon-cyan": withOpacity("--color-neon-cyan-rgb"),
        "slate-body": "#2D3748",
        "light-grey": "#E2E8F0",
        // Keep blue/cyan namespace aliases for convenience
        blue: {
          electric: withOpacity("--color-electric-blue-rgb"),
          DEFAULT: "#1A73E8",
        },
        cyan: {
          accent: withOpacity("--color-cyan-accent-rgb"),
          neon: withOpacity("--color-neon-cyan-rgb"),
          DEFAULT: "#00BCD4",
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

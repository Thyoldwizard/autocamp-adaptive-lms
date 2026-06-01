/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Palette ────────────────────────────────────────────────────────────
      colors: {
        background: "#F9F7F4",
        primary:    "#2D6A4F",
        accent:     "#F4A261",
        text:       "#1A1A1A",
        card:       "#FFFFFF",
        danger:     "#E07B6A",
        muted:      "#6B7280",
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ["Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
      },

      // ── Radii ──────────────────────────────────────────────────────────────
      borderRadius: {
        card:  "12px",
        input: "8px",
        badge: "999px",
      },

      // ── Shadows ────────────────────────────────────────────────────────────
      boxShadow: {
        card:       "0 2px 16px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 24px rgba(0,0,0,0.10)",
      },

      // ── Animation durations ────────────────────────────────────────────────
      // Used as: duration-micro, duration-fast, duration-base, duration-slow, duration-reveal
      transitionDuration: {
        micro:  "200ms",
        fast:   "400ms",
        base:   "600ms",
        slow:   "900ms",
        reveal: "1200ms",
      },
    },
  },
  plugins: [],
};

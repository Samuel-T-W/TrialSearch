/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(
          [
            "paper",
            "surface",
            "ink",
            "muted",
            "line",
            "brand-ink",
            "brand-soft",
            "st-feed",
            "st-feed-bg",
            "st-qualified",
            "st-qualified-bg",
            "st-registered",
            "st-registered-bg",
            "st-archive",
            "st-archive-bg",
            "st-not-qualified",
            "st-not-qualified-bg",
          ].map((name) => [name, token(name)]),
        ),
        brand: { DEFAULT: token("brand"), dark: token("brand-ink"), light: token("brand-soft") },
      },
      fontFamily: {
        sans: ["Atkinson Hyperlegible", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Newsreader Variable", "Georgia", "serif"],
      },
      fontSize: {
        xs: ["13px", "1.4"],
        sm: ["15px", "1.45"],
        base: ["17px", "1.5"],
        lg: ["20px", "1.35"],
        xl: ["24px", "1.3"],
        "2xl": ["32px", "1.15"],
      },
    },
  },
  plugins: [],
};

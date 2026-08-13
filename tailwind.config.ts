import type { Config } from "tailwindcss";

/**
 * CJK fallbacks have to trail every family we declare — the site is
 * bilingual (en / zh-CN) and neither our display face nor the Latin UI
 * stack ships Chinese glyphs, so the browser needs somewhere to go
 * per-glyph rather than dropping to a default serif.
 */
const cjkFallbacks = [
  "'PingFang SC'",
  "'Hiragino Sans GB'",
  "'Microsoft YaHei'",
  "'Helvetica Neue'",
  "Arial",
  "sans-serif",
];

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          ...cjkFallbacks,
        ],
        // Comfortaa — the face used in the Kiwi Cloud Homes logo lockup.
        // Reserved for the wordmark and top-level headings; body copy stays
        // on the system stack for readability at small sizes.
        display: ["var(--font-display)", ...cjkFallbacks],
      },
      colors: {
        /**
         * Brand palette, straight off the logo artwork:
         *   navy  #1E4E79 — wordmark, deep surfaces
         *   blue  #2C6E9E — house outline, primary actions
         *   sky   #4A9BD4 — kiwi bird, accents
         *   cloud #A9CFEA — cloud fill, tints
         */
        brand: {
          navy: "#1E4E79",
          blue: "#2C6E9E",
          sky: "#4A9BD4",
          cloud: "#A9CFEA",
        },
        /**
         * The `kiwi` ramp is the site-wide UI scale. It keeps its name (and
         * every existing `kiwi-*` class keeps working) but is now built
         * around the four brand blues above rather than the old green:
         * 200 = cloud, 400 = sky, 600 = blue, 800 = navy. The in-between
         * steps are interpolated to keep the ramp even.
         *
         * Contrast: 600 on white is 5.5:1 and white on 600 is 5.5:1, so the
         * existing `bg-kiwi-600 text-white` buttons and `text-kiwi-600`
         * labels stay AA-compliant; 700/800/900 only improve on that.
         */
        kiwi: {
          50: "#f3f8fc",
          100: "#e2eff9",
          200: "#a9cfea",
          300: "#7cb8e0",
          400: "#4a9bd4",
          500: "#3785bd",
          600: "#2c6e9e",
          700: "#245c84",
          800: "#1e4e79",
          900: "#163a5b",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

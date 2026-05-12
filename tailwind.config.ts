import type { Config } from "tailwindcss";

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
          "'PingFang SC'",
          "'Hiragino Sans GB'",
          "'Microsoft YaHei'",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        kiwi: {
          50: "#f1f7f1",
          100: "#dcecdc",
          200: "#b9d8b9",
          300: "#8ebd8e",
          400: "#629d62",
          500: "#3f7f3f",
          600: "#306330",
          700: "#264d26",
          800: "#1f3e1f",
          900: "#1a331a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

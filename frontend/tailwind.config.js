/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        brand: {
          700: "#3368A0",
          500: "#66A3BF",
          200: "#C8DFDB",
          50: "#F2EFE7",
        },
      },
    },
  },
  plugins: [],
};

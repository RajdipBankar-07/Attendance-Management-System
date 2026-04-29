/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        secondary: "#10B981",
        danger: "#EF4444",
        background: "#0F172A",
        card: "rgba(30, 41, 59, 0.7)",
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}

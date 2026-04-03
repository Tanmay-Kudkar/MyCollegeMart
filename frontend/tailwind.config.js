/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // This enables the class-based dark mode
  theme: {
    extend: {
      // Your custom theme extensions
    },
  },
  plugins: [],
}

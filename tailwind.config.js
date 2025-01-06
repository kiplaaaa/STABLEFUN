/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'stablebond': {
          black: '#141414',
          'card-bg': '#1E1E1E',
          border: '#2C2C2C',
          accent: '#CDFE00',
          'accent-hover': '#bae800',
        }
      },
    },
  },
  plugins: [],
}

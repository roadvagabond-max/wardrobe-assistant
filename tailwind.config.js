/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#d4af37',
          light: '#f3e5ab',
          dark: '#997a15',
          glow: 'rgba(212, 175, 55, 0.25)',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Cinzel', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      scale: {
        '115': '1.15',
      },
      screens: {
        'xs': '480px',
      }
    },
  },
  plugins: [],
};

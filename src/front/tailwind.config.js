/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0056B3',
        'primary-dark': '#004494',
        'primary-light': '#E5F0FF',
        background: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'card': '0px 4px 12px rgba(0, 0, 0, 0.05)',
        'sidebar': '4px 0px 24px rgba(0, 0, 0, 0.02)',
        'button': '0px 4px 8px rgba(0, 86, 179, 0.2)',
      },
    },
  },
  plugins: [],
}

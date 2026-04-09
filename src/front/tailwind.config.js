/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - OU Blue
        primary: {
          DEFAULT: '#0054a6',
          light: '#eaf4ff',
          dark: '#003b78',
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#b8d9ff',
          300: '#8cc2ff',
          400: '#5fa9f7',
          500: '#2f89e8',
          600: '#1769c8',
          700: '#0054a6',
          800: '#003b78',
          900: '#022a52',
        },
        // Status Colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50: '#eefbff',
          100: '#d7f3ff',
          200: '#aee7ff',
          300: '#78d8ff',
          400: '#33c1f2',
          500: '#0099d8',
          600: '#007ab0',
          700: '#005e8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '1.4', fontWeight: '700' }],
        'h2': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.6', fontWeight: '400' }],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        'button': '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
        'sidebar': '4px 0px 24px rgba(0, 0, 0, 0.02)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0054a6 0%, #0099d8 100%)',
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      const buttons = {
        '.btn-primary': {
          '@apply px-4 py-2.5 bg-primary-500 text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-primary-600 active:bg-primary-700 transition-colors hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-secondary': {
          '@apply px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm border border-gray-200 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
      };
      addComponents(buttons);
    },
  ],
}

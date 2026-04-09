/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Modern Blue
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
        // Secondary - Cyan (complementary)
        secondary: {
          50: '#ecf0ff',
          100: '#dce7ff',
          200: '#bccfff',
          300: '#91b5ff',
          400: '#5a8fff',
          500: '#2563eb',  // Indigo
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
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
          800: '#166534',
          900: '#145231',
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
          800: '#92400e',
          900: '#78350f',
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
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          50: '#ecf0ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Neutral - Professional Gray
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          150: '#ededf0',  // Between 100 and 200
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#03040a',
        },
      },

      fontFamily: {
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },

      fontSize: {
        // Display
        'display-lg': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        // Headings
        'h1': ['24px', { lineHeight: '1.4', fontWeight: '700' }],
        'h2': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        'h4': ['14px', { lineHeight: '1.5', fontWeight: '600' }],
        // Body
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-xs': ['11px', { lineHeight: '1.5', fontWeight: '400' }],
        // Labels
        'label-md': ['13px', { lineHeight: '1.5', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
      },

      spacing: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
        '6xl': '48px',
      },

      borderRadius: {
        'none': '0',
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        'full': '9999px',
      },

      boxShadow: {
        'none': '0 0 0 0 rgba(0, 0, 0, 0)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'button': '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
      },

      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-warning': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-error': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },

      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        'fadeIn': 'fadeIn 300ms ease-in-out',
        'slideInUp': 'slideInUp 300ms ease-out',
        'slideInDown': 'slideInDown 300ms ease-out',
        'scaleIn': 'scaleIn 300ms ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      transitionTimingFunction: {
        'material': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    // Custom components plugin
    function ({ addComponents, theme }) {
      const buttons = {
        '.btn-primary': {
          '@apply px-4 py-2.5 bg-primary-500 text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-primary-600 active:bg-primary-700 transition-colors hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-secondary': {
          '@apply px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm border border-gray-200 hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-tertiary': {
          '@apply px-4 py-2.5 text-primary-600 rounded-lg font-semibold text-sm hover:bg-primary-50 active:bg-primary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
      };

      const cards = {
        '.card': {
          '@apply bg-white rounded-xl border border-gray-200 p-6 shadow-card': {},
        },
        '.card-interactive': {
          '@apply bg-white rounded-xl border border-gray-200 p-6 shadow-card hover:shadow-lg hover:border-primary-200 cursor-pointer transition-all duration-200': {},
        },
      };

      const inputs = {
        '.input': {
          '@apply w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500 transition-all': {},
        },
      };

      const status = {
        '.badge-success': {
          '@apply inline-flex items-center gap-2 px-3 py-1.5 bg-success-50 text-success-700 rounded-full text-xs font-semibold': {},
        },
        '.badge-warning': {
          '@apply inline-flex items-center gap-2 px-3 py-1.5 bg-warning-50 text-warning-700 rounded-full text-xs font-semibold': {},
        },
        '.badge-error': {
          '@apply inline-flex items-center gap-2 px-3 py-1.5 bg-error-50 text-error-700 rounded-full text-xs font-semibold': {},
        },
        '.badge-info': {
          '@apply inline-flex items-center gap-2 px-3 py-1.5 bg-info-50 text-info-700 rounded-full text-xs font-semibold': {},
        },
      };

      addComponents({ ...buttons, ...cards, ...inputs, ...status });
    },
  ],
}

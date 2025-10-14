/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Theme-aware gray colors that adapt based on the theme
        gray: {
          50: 'rgb(var(--bg-secondary))',   // white
          100: 'rgb(var(--bg-tertiary))',   // #F5F5F5
          200: 'rgb(var(--border-secondary))', // #D1D5DB
          300: 'rgb(var(--border-primary))',   // #9CA3AF
          400: 'rgb(var(--text-tertiary))',    // #9CA3AF
          500: 'rgb(var(--text-primary))',     // #4B5563
          600: 'rgb(var(--text-primary))',     // #4B5563
          700: 'rgb(var(--text-secondary))',   // #111827
          800: 'rgb(var(--bg-elevated))',      // white
          900: 'rgb(var(--card-bg))',         // white
          950: 'rgb(var(--bg-primary))',      // #F8F8F8
        },
        // Preserve existing color schemes
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
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
          900: '#14532d',
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
        danger: {
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
      },
        // Override text colors to be theme-aware
        textColor: {
          white: 'rgb(var(--text-primary))',  // #4B5563 in light mode
          black: 'rgb(var(--text-secondary))', // #111827 in light mode
        },
      // Override background colors to be theme-aware
      backgroundColor: {
        white: 'rgb(var(--bg-secondary))',
        black: 'rgb(var(--bg-primary))',
      },
      // Override border colors to be theme-aware
      borderColor: {
        white: 'rgb(var(--border-primary))',
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base colors
        'bg': 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-card-hover': 'var(--bg-card-hover)',
        'bg-subtle': 'var(--bg-subtle)',
        'border': 'var(--border)',
        'border-hover': 'var(--border-hover)',

        // Text colors
        'ink': 'var(--ink)',
        'ink-secondary': 'var(--ink-secondary)',
        'ink-muted': 'var(--ink-muted)',

        // Brand
        'primary': {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          glow: 'var(--primary-glow)',
        },

        // Status
        'success': {
          DEFAULT: 'var(--success)',
          light: 'var(--success-light)',
        },
        'warning': {
          DEFAULT: 'var(--warning)',
          light: 'var(--warning-light)',
        },
        'error': {
          DEFAULT: 'var(--error)',
          light: 'var(--error-light)',
        },
      },
      borderRadius: {
        'xl': 'var(--radius-xl)',
        'lg': 'var(--radius-lg)',
        'md': 'var(--radius-md)',
        'sm': 'var(--radius-sm)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'primary': 'var(--shadow-primary)',
      },
      fontFamily: {
        sans: 'var(--font)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      keyframes: {
        'toast-slide-in': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-progress': {
          from: { width: '100%' },
          to: { width: '0%' },
        },
        'slide-down': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        'icon-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
      animation: {
        'toast-slide': 'toast-slide-in 0.3s ease',
        'toast-progress': 'toast-progress 4s linear forwards',
        'slide-down': 'slide-down 0.3s ease',
        'icon-pulse': 'icon-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "adventure journal" palette
        parchment: {
          DEFAULT: '#faf5ea',
          50: '#fdfbf6',
          100: '#faf5ea',
          200: '#f2e8d0',
          300: '#e8d7ae',
        },
        ink: {
          DEFAULT: '#2b2559',
          soft: '#4a4470',
          muted: '#6b6690',
        },
        accent: {
          DEFAULT: '#7c5cff',
          soft: '#a48bff',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        jp: ['"Noto Sans JP"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config;

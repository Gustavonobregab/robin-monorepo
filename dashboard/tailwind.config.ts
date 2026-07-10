import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './app/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFDF6',
        'background-section': '#FAF6E9',
        'accent-light': '#DDEB9D',
        'accent-strong': '#A0C878',
        foreground: '#111111',
        muted: '#444444',
        border: '#E8E4D8',
        // Semantic status tones — the single source of truth for success /
        // warning / danger. Success reuses the accent (olive). Keep these here;
        // never hardcode red/amber Tailwind palette classes in components.
        danger: '#B23B2E',
        'danger-light': '#F6E5E1',
        warning: '#9A6B15',
        'warning-light': '#F5EBD5',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1E4C4A',
          light: '#4A7C59',
        },
        accent: '#C17B6E',
        background: '#F7F3EF',
        border: '#E0D9D3',
      },
      keyframes: {
        pulse_glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(193,123,110,0.7)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 0 8px rgba(193,123,110,0)', transform: 'scale(1.02)' },
        },
      },
      animation: {
        pulse_glow: 'pulse_glow 0.8s ease-in-out 3',
      },
    },
  },
  plugins: [],
}

export default config

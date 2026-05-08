import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, './index.html'),
    path.join(__dirname, './src/**/*.{js,jsx}'),
  ],
  theme: {
    extend: {
      colors: {
        // Suits
        suit: {
          spade:   '#1a1a2e',
          club:    '#1a2e1a',
          heart:   '#c0392b',
          diamond: '#c0392b',
        },
        // App brand
        brand: {
          green:  '#2d6a4f',
          felt:   '#1b4332',
          gold:   '#b8860b',
          card:   '#fafaf8',
        },
      },
      fontFamily: {
        card: ['Georgia', 'serif'],
        ui:   ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        card: {
          blue: {
            bg: '#dbeafe',
            border: '#3b82f6',
            text: '#1e40af',
          },
          green: {
            bg: '#dcfce7',
            border: '#22c55e',
            text: '#166534',
          },
          yellow: {
            bg: '#fef9c3',
            border: '#eab308',
            text: '#854d0e',
          },
          red: {
            bg: '#fee2e2',
            border: '#ef4444',
            text: '#991b1b',
          },
        },
      },
    },
  },
  plugins: [],
}

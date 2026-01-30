/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        critical: '#ef4444',
        high: '#f59e0b',
        medium: '#eab308',
        low: '#10b981',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(14, 165, 233, 0.4)',
        'glow-critical': '0 0 20px rgba(239, 68, 68, 0.4)',
      },
    },
  },
  plugins: [],
}

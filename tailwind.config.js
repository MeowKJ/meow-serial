/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cat': {
          'primary': 'var(--cat-primary)',
          'secondary': 'var(--cat-secondary)',
          'accent': 'var(--cat-accent)',
          'warm': 'var(--cat-warm)',
          'dark': 'var(--cat-dark)',
          'card': 'var(--cat-card)',
          'surface': 'var(--cat-surface)',
          'border': 'var(--cat-border)',
          'text': 'var(--cat-text)',
          'muted': 'var(--cat-muted)',
        }
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}

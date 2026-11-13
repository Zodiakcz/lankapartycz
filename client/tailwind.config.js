/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Steam-like palette. `zinc` and `indigo` are redefined instead of renamed so the
      // ~300 existing utility classes pick up the theme without touching every page.
      colors: {
        // Blue-slate neutrals: page #171d25, cards #1e2a37, inputs #2a3b4d, text #c6d4df
        zinc: {
          50: '#f3f6f9',
          100: '#e4ebf1',
          200: '#c6d4df',
          300: '#acbac6',
          400: '#8f9ca8',
          500: '#6d7b88',
          600: '#536170',
          700: '#3a4b5d',
          800: '#2a3b4d',
          900: '#1e2a37',
          950: '#171d25',
        },
        // Steam accent blue (#66c0f4 links, #1a9fff highlights)
        indigo: {
          50: '#ebf7fe',
          100: '#d3eefc',
          200: '#ade0f9',
          300: '#8ad1f7',
          400: '#66c0f4',
          500: '#3ea6e6',
          600: '#2a7fb8',
          700: '#23668f',
          800: '#1d4f6e',
          900: '#183d55',
          950: '#0f2537',
        },
        // Steam's darker chrome (top bar, footer)
        chrome: '#11161d',
      },
      // Tailwind 3 has no 6 or 8 step; without these, `border-white/8` generates nothing
      // and the border falls back to preflight's light gray
      opacity: {
        6: '0.06',
        8: '0.08',
      },
      // Steam corners are nearly square
      borderRadius: {
        lg: '0.25rem',
        xl: '0.375rem',
        '2xl': '0.5rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

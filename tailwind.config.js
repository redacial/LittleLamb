/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm Editorial palette — sage primary, cream ground, terracotta accent, charcoal ink
        sage: {
          50: '#f1f6f2',
          100: '#dde9e0',
          200: '#bcd3c2',
          300: '#9bbda4',
          400: '#7bae8a', // primary
          500: '#5f936e',
          600: '#4a7656',
          700: '#3c5e46',
          800: '#324c3a',
          900: '#2a3f31',
        },
        cream: {
          DEFAULT: '#faf6ef',
          50: '#fdfbf7',
          100: '#faf6ef',
          200: '#f3ebdd',
          300: '#e9ddc9',
        },
        terracotta: {
          50: '#fbf0ec',
          100: '#f4d8ce',
          200: '#e8b3a1',
          300: '#dc8e74',
          400: '#cf7351', // accent
          500: '#bd5b3a',
          600: '#a0492e',
          700: '#813a26',
        },
        charcoal: {
          DEFAULT: '#2f2b28',
          muted: '#6b645d',
          faint: '#9a938b',
        },
        // Semantic booking states
        confirmed: '#5f936e',
        pending: '#d99746',
        booked: '#5b7da6',
      },
      fontFamily: {
        // Display: warm editorial serif. Body/UI: Nunito (rounded, approachable).
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Editorial type scale
        'display-xl': ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.25rem, 4.5vw, 3.25rem)', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(1.75rem, 3vw, 2.25rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        eyebrow: ['0.8125rem', { lineHeight: '1', letterSpacing: '0.14em' }],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(47,43,40,0.04), 0 8px 24px -12px rgba(47,43,40,0.12)',
        lift: '0 2px 4px rgba(47,43,40,0.05), 0 18px 40px -16px rgba(47,43,40,0.18)',
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
}

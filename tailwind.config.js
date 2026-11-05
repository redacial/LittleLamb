/** @type {import('tailwindcss').Config} */
// Premium Playful design system — see DESIGN_SYSTEM.md (locked v1.0).
// Replaces the old Warm Editorial (Fraunces/Nunito, sage-*/cream-*/terracotta-* numeric scales).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals
        'll-cream':      '#F5F0E8',
        'll-cream-dark': '#EDE6D8',
        'll-warm-gray':  '#6B5E4E',
        'll-ink':        '#2C2416',
        // Sage — primary brand
        'll-sage-light': '#C8DEC4',
        'll-sage':       '#8FAF8A',
        'll-sage-mid':   '#5C7F57',
        'll-sage-deep':  '#3D5C3A',
        // Periwinkle — trust, calm, information
        'll-peri-light': '#DDE3F0',
        'll-peri-soft':  '#B0BCE0',
        'll-peri':       '#8B9DC3',
        'll-peri-deep':  '#5B6E99',
        'll-peri-ink':   '#2C3E6B',
        // Terracotta — CTA, accent, warmth
        'll-terra-light':'#F0DFD0',
        'll-terra-soft': '#D4AA85',
        'll-terra':      '#C4956A',
        'll-terra-deep': '#9B6A3F',
        // Semantic booking states — map onto the palette above
        // confirmed = sage, pending = warm amber-terra, booked = periwinkle
        confirmed: '#8FAF8A',
        pending:   '#C4956A',
        booked:    '#8B9DC3',
      },
      fontFamily: {
        // Display/headlines: Caveat. Body/UI: DM Sans. Trust labels/badges/IDs: DM Mono.
        display: ['Caveat', 'cursive'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Premium Playful type scale (DESIGN_SYSTEM.md §Type Scale)
        'display-xl': ['clamp(2.75rem, 6vw, 3.5rem)', { lineHeight: '1.0', letterSpacing: '0' }],
        'display-lg': ['clamp(2rem, 4.5vw, 2.5rem)',  { lineHeight: '1.05', letterSpacing: '0' }],
        'display-md': ['1.75rem', { lineHeight: '1.1' }],
        'display-sm': ['1.375rem', { lineHeight: '1.15' }],
        'mono-sm': ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.02em' }],
        label: ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0' }],
        eyebrow: ['0.75rem', { lineHeight: '1', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        'll-card':  '20px',
        'll-input': '14px',
        'll-modal': '24px',
        'll-tag':   '8px',
        // legacy aliases kept so any stray xl/2xl usages still resolve to the new scale
        xl: '20px',
        '2xl': '24px',
      },
      borderWidth: {
        // Chunky hand-drawn borders — 1.5px default per DESIGN_SYSTEM.md §Border Style
        '1.5': '1.5px',
      },
      boxShadow: {
        // Warm-tinted shadows (brown, never gray) — the premium-vs-cheap signature.
        soft: '0 1px 2px rgba(44,36,22,0.04), 0 8px 24px -12px rgba(44,36,22,0.14)',
        lift: '0 2px 4px rgba(44,36,22,0.05), 0 18px 40px -16px rgba(44,36,22,0.20)',
        // "pop" = hard offset shadow (the Clay hover move) — crisp, intentional, hand-made feel.
        pop:      '-6px 6px 0 0 rgba(44,36,22,0.16)',
        'pop-sage': '-6px 6px 0 0 rgba(92,127,87,0.30)',
        'pop-peri': '-6px 6px 0 0 rgba(91,110,153,0.28)',
        'pop-terra':'-6px 6px 0 0 rgba(155,106,63,0.28)',
      },
      maxWidth: {
        prose: '68ch',
      },
      animation: {
        'spring-in': 'springIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        // Slow async bob loops for floating decorative elements (the "alive" feel).
        'bob':      'bob 5s ease-in-out infinite',
        'bob-slow': 'bob 7s ease-in-out infinite',
        'drift':    'drift 18s ease-in-out infinite',
      },
      keyframes: {
        springIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(14px, -18px) scale(1.05)' },
          '66%':      { transform: 'translate(-12px, 10px) scale(0.97)' },
        },
      },
    },
  },
  plugins: [],
}

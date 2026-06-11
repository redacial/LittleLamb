# LittleLamb Nannies — Design System
**Version:** 1.0 — June 2026
**Status:** Locked. All decisions confirmed. Claude must read this before touching any component.

---

## Brand DNA

| Dimension | Decision |
|-----------|----------|
| Primary feeling | Premium + playful. Trust-earned, never sterile. |
| Tension | Boutique children's brand energy on the surface, serious vetting underneath. |
| Reference | Hand-drawn illustration style — loose lines, flat dusty fills, cream bg, generous negative space. Think the loose cartoonish illustration style of a high-end children's brand. |
| Chrome | Wobbly borders, oversized radius, illustrated empty states, illustrated accents on hover |
| Motion | Bouncy spring physics everywhere — things feel alive, not corporate |
| Anti-patterns | No purple gradients. No flat white SaaS cards. No Inter. No sterile grid layouts. No stiff transitions. |

---

## Color Tokens

These are the canonical token names. Use these exact names in Tailwind and CSS custom properties.

### Neutrals
| Token | Hex | Role |
|-------|-----|------|
| `ll-cream` | `#F5F0E8` | Page background, illustration background |
| `ll-cream-dark` | `#EDE6D8` | Card surfaces, input backgrounds |
| `ll-warm-gray` | `#6B5E4E` | Body text, secondary text |
| `ll-ink` | `#2C2416` | Headlines, primary text |

### Sage — Primary Brand Color
| Token | Hex | Role |
|-------|-----|------|
| `ll-sage-light` | `#C8DEC4` | Fills, chips, hover backgrounds |
| `ll-sage` | `#8FAF8A` | Primary buttons, nav active states, brand moments |
| `ll-sage-mid` | `#5C7F57` | Pressed states, borders on sage elements |
| `ll-sage-deep` | `#3D5C3A` | Text on sage backgrounds |

### Periwinkle — Trust, Calm, Information
| Token | Hex | Role |
|-------|-----|------|
| `ll-peri-light` | `#DDE3F0` | Info badge backgrounds, verification chip fills |
| `ll-peri-soft` | `#B0BCE0` | Soft accents, nanny profile card borders |
| `ll-peri` | `#8B9DC3` | Verification badges, background check confirmed, credential chips, links |
| `ll-peri-deep` | `#5B6E99` | Text on periwinkle backgrounds, pressed link states |
| `ll-peri-ink` | `#2C3E6B` | Dark accent, use sparingly — premium moments only |

### Terracotta — CTA, Accent, Warmth
| Token | Hex | Role |
|-------|-----|------|
| `ll-terra-light` | `#F0DFD0` | Highlight backgrounds |
| `ll-terra-soft` | `#D4AA85` | Decorative accents |
| `ll-terra` | `#C4956A` | Primary CTAs, "Book Now", pricing highlights |
| `ll-terra-deep` | `#9B6A3F` | Text on terracotta, pressed CTA states |

### Semantic (map to the above, not to raw hex)
| Role | Token to use |
|------|-------------|
| Success | `ll-sage` / `ll-sage-light` |
| Info / Trust | `ll-peri` / `ll-peri-light` |
| CTA / Action | `ll-terra` |
| Danger / Error | Use Tailwind `red-400` — the one exception to LL token exclusivity |

---

## Typography

### Font Stack
| Role | Font | Source | Usage |
|------|------|--------|-------|
| Display / Headlines | **Caveat** | Google Fonts | Hero text, section headers, illustrated labels, personality moments |
| Body | **DM Sans** | Google Fonts | All body copy, UI labels, form fields, nav items |
| Mono / Trust labels | **DM Mono** | Google Fonts | Verification badges, credential chips, booking IDs, pricing |

### Load in index.html
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale
| Name | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| `display-xl` | Caveat | 56px | 700 | Hero headline only |
| `display-lg` | Caveat | 40px | 700 | Section heroes |
| `display-md` | Caveat | 28px | 600 | Card headlines, empty state headers |
| `display-sm` | Caveat | 22px | 600 | Subheadings with personality |
| `body-lg` | DM Sans | 18px | 400 | Lead paragraph text |
| `body-md` | DM Sans | 16px | 400 | Standard body |
| `body-sm` | DM Sans | 14px | 400 | Secondary copy, captions |
| `label` | DM Sans | 13px | 500 | Form labels, nav items |
| `mono-sm` | DM Mono | 12px | 500 | Badges, chips, IDs |

---

## Spacing System

Base unit: 4px. All spacing is multiples of 4.

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Inline gaps |
| `space-2` | 8px | Component-internal gaps |
| `space-3` | 12px | Small padding |
| `space-4` | 16px | Standard padding |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large section gaps |
| `space-12` | 48px | Page-level breathing room |
| `space-16` | 64px | Hero sections |

---

## Border Radius

Intentionally large — this is part of the playful premium feel.

| Element | Radius | Token |
|---------|--------|-------|
| Page cards | 20px | `rounded-ll-card` |
| Form inputs | 14px | `rounded-ll-input` |
| Buttons | 9999px | `rounded-full` |
| Badges / chips | 9999px | `rounded-full` |
| Modals | 24px | `rounded-ll-modal` |
| Small tags | 8px | `rounded-ll-tag` |

---

## Border Style

Borders are slightly chunky — 1.5px, not hairline. This reinforces the hand-drawn, intentional feel.

```css
border: 1.5px solid var(--ll-ink); /* default border */
border: 1.5px solid var(--ll-sage); /* brand border */
border: 1.5px solid var(--ll-peri); /* trust/info border */
```

For the "wobbly" card effect on marketing surfaces, use SVG border or CSS clip-path with slight irregularity. Never on functional app UI (forms, tables, data) — only on marketing cards, empty states, and illustration containers.

---

## Motion & Spring Physics

Every interactive element uses spring physics. No linear or ease-in-out on user-facing interactions.

### Spring Config (Framer Motion)
```ts
// Standard spring — buttons, cards, chips
export const springStandard = {
  type: "spring",
  stiffness: 280,
  damping: 18,
  mass: 1,
}

// Gentle spring — modals, drawers, page transitions
export const springGentle = {
  type: "spring",
  stiffness: 180,
  damping: 20,
  mass: 1,
}

// Snappy spring — badges, confirmations, toasts
export const springSnappy = {
  type: "spring",
  stiffness: 400,
  damping: 22,
  mass: 0.8,
}
```

### Hover States
```ts
// Cards and large elements
whileHover={{ scale: 1.03, rotate: 0.8 }}
whileTap={{ scale: 0.97 }}
transition={springStandard}

// Buttons
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
transition={springSnappy}

// Chips and badges
whileHover={{ scale: 1.08 }}
transition={springSnappy}
```

### Reduced motion
Always wrap motion in `useReducedMotion()`. If reduced motion is preferred, fall back to instant opacity transitions only.

```ts
const prefersReduced = useReducedMotion()
const transition = prefersReduced ? { duration: 0.15 } : springStandard
```

---

## Component Patterns

### Buttons
- Shape: pill (`rounded-full`)
- Primary: `bg-ll-terra text-white` hover → `bg-ll-terra-deep`
- Secondary: `bg-ll-sage text-ll-sage-deep` hover → `bg-ll-sage-mid`
- Ghost: `border-1.5 border-ll-ink text-ll-ink bg-transparent` hover → `bg-ll-cream-dark`
- All buttons: spring scale on hover and tap
- Min tap target: 44px height (WCAG)

### Cards
- Radius: 20px
- Background: `ll-cream-dark`
- Border: `1.5px solid ll-cream-dark` (subtle) or `1.5px solid ll-sage-light` (branded)
- Hover: `scale(1.03) rotate(0.8deg)` spring
- Padding: 20px minimum

### Form Inputs
- Radius: 14px
- Background: white / `ll-cream`
- Border: `1.5px solid ll-warm-gray` focus → `1.5px solid ll-sage`
- Label: DM Sans 13px/500, `ll-ink`
- Error: red-400 border + DM Sans 13px error message below

### Trust Badges / Verification Chips
- Font: DM Mono 12px/500
- Background: `ll-peri-light`
- Text: `ll-peri-deep`
- Border: `1.5px solid ll-peri-soft`
- Icon: checkmark or shield, 14px
- These are the most important trust signals — never truncate, never hide on mobile

### Empty States
- Always include an illustration (hand-drawn style, cream background)
- Headline: Caveat display-md
- Body: DM Sans body-sm, `ll-warm-gray`
- CTA button below

### Nanny Profile Cards
- Periwinkle border: `1.5px solid ll-peri-soft` — signals vetting at a glance
- Photo: circular, 72px, with sage ring
- Verification chips below name (DM Mono)
- Hover: spring scale + slight rotate

---

## Illustration Style Guidelines

When generating or specifying illustrations:
- Line weight: 1.5–2px, hand-drawn quality, intentionally imperfect
- Fill: flat, dusty — never saturated. Use palette colors at ~60% opacity
- Background: always `ll-cream` (#F5F0E8) — never white
- Characters: slightly oversized heads, simple anatomy, approachable
- Negative space: generous — let illustrations breathe
- No photographic elements mixed with illustrations on the same surface

---

## Tailwind Config

Replace `tailwind.config.js` with this token set. This is a full replacement of the old Fraunces/Nunito system.

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals
        'll-cream':      '#F5F0E8',
        'll-cream-dark': '#EDE6D8',
        'll-warm-gray':  '#6B5E4E',
        'll-ink':        '#2C2416',
        // Sage
        'll-sage-light': '#C8DEC4',
        'll-sage':       '#8FAF8A',
        'll-sage-mid':   '#5C7F57',
        'll-sage-deep':  '#3D5C3A',
        // Periwinkle
        'll-peri-light': '#DDE3F0',
        'll-peri-soft':  '#B0BCE0',
        'll-peri':       '#8B9DC3',
        'll-peri-deep':  '#5B6E99',
        'll-peri-ink':   '#2C3E6B',
        // Terracotta
        'll-terra-light':'#F0DFD0',
        'll-terra-soft': '#D4AA85',
        'll-terra':      '#C4956A',
        'll-terra-deep': '#9B6A3F',
      },
      fontFamily: {
        display: ['Caveat', 'cursive'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      borderRadius: {
        'll-card':  '20px',
        'll-input': '14px',
        'll-modal': '24px',
        'll-tag':   '8px',
      },
      animation: {
        'spring-in': 'springIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        springIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## Trust Signal Hierarchy

LittleLamb's core UX problem: parents are sharing home access with a stranger. Every screen must address this. Priority order:

1. **Background check confirmed** — periwinkle chip, DM Mono, shield icon. Must appear on every nanny card and profile above the fold.
2. **Admin-interviewed** — periwinkle chip. Second most important signal.
3. **Years of experience** — visible on card, not buried in profile.
4. **Families worked with** — social proof number. Show as "Worked with X families".
5. **Response rate** — only show if ≥ 90%. Hide if lower — absence is better than a low number.
6. **Photo** — real photo mandatory. No avatars or initials on nanny cards.

---

## Design Sweep Protocol

When triggered by "design sweep" — autonomous, no confirmation between steps:

1. `/grade` → baseline score, all 7 dimensions → append to `design-audit.md`
2. `/fix` → rewrite AI-default patterns
3. `/cognitive-check` → Hick's Law, Fitts's Law, Miller's Law
4. `/ux-audit` → NNG heuristics, severity-rated
5. `/a11y` → WCAG 2.2 AA, flag with file + line number
6. `/qa` → token compliance — verify all components use tokens from §Tailwind Config above
7. Trust audit → flag every missing trust signal ranked by parent anxiety level
8. `/grade` → re-score, compute delta

If delta ≥ 10 or any P0 remains → loop again. Output final fix list ranked by trust impact.
Append all findings to `design-audit.md`.

---

## What Was Replaced

The following are from the old design system and must not appear anywhere in the codebase:

| Old | Replace with |
|-----|-------------|
| Fraunces | Caveat |
| Nunito | DM Sans |
| `display-font` Tailwind token | `font-display` → Caveat |
| `sans-font` Tailwind token | `font-sans` → DM Sans |
| Any `sage-*` numeric Tailwind scale | `ll-sage`, `ll-sage-light`, etc. |
| Any `cream-*` numeric scale | `ll-cream`, `ll-cream-dark` |
| Any `terracotta-*` numeric scale | `ll-terra`, `ll-terra-deep`, etc. |
| `booking-state-*` tokens | Keep — map to new color tokens where needed |

When refactoring: search for `font-display` (old Fraunces), `font-[Fraunces]`, `font-[Nunito]` and replace. Run `grep -r "Fraunces\|Nunito\|fraunces\|nunito" src/` to find all instances.

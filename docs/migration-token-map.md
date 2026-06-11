# Old → New Token Map (Warm Editorial → Premium Playful)

Apply this mapping EXACTLY when migrating any component. After migration, **zero**
references to the left column may remain in `src/`. The right column are the only
color/font tokens that may appear. See DESIGN_SYSTEM.md for the source of truth.

## Backgrounds / surfaces
| Old | New |
|-----|-----|
| `bg-cream`, `bg-cream-50`, `bg-cream-100` | `bg-ll-cream` |
| `bg-cream-200`, `bg-cream-300` | `bg-ll-cream-dark` |
| `bg-white` (card/surface/input) | keep `bg-white` for inputs; cards → `bg-ll-cream-dark` |
| `ring-offset-cream` | `ring-offset-ll-cream` |

## Text / ink
| Old | New |
|-----|-----|
| `text-charcoal` | `text-ll-ink` |
| `text-charcoal-muted` | `text-ll-warm-gray` |
| `text-charcoal-faint` | `text-ll-warm-gray` |
| `charcoal/10`, `charcoal/15`, `charcoal/[0.06]` (borders/rings) | `ll-ink/10` etc., or prefer `border-1.5 border-ll-cream-dark` |

## Sage (primary brand)
| Old | New |
|-----|-----|
| `sage-50`, `sage-100`, `sage-200` | `ll-sage-light` |
| `sage-300`, `sage-400`, `sage-500` | `ll-sage` |
| `sage-600`, `sage-700` | `ll-sage-mid` |
| `sage-800`, `sage-900` | `ll-sage-deep` |
| text on sage bg | `text-ll-sage-deep` |

## Terracotta (CTA / accent / warmth)
| Old | New |
|-----|-----|
| `terracotta-50`, `terracotta-100` | `ll-terra-light` |
| `terracotta-200`, `terracotta-300` | `ll-terra-soft` |
| `terracotta-400`, `terracotta-500` | `ll-terra` |
| `terracotta-600`, `terracotta-700` | `ll-terra-deep` |

## Periwinkle (NEW — trust / info / verification)
Use periwinkle for trust signals: background-check chips, verification badges,
credential chips, info panels, nanny-profile-card borders, links.
| Need | Token |
|------|-------|
| info/verify chip bg | `bg-ll-peri-light` |
| nanny card border | `border-ll-peri-soft` |
| verification badge / link | `ll-peri` |
| text on peri bg | `text-ll-peri-deep` |

## Booking-state semantic tokens (KEEP — already mapped in config)
- `confirmed` → sage, `pending` → terra-amber, `booked` → periwinkle.
- `StatusPill` tones: confirmed→`bg-ll-sage-light text-ll-sage-deep`,
  pending→`bg-ll-terra-light text-ll-terra-deep`, cancelled→`bg-ll-cream-dark text-ll-warm-gray`,
  open→`bg-ll-peri-light text-ll-peri-deep`, neutral→`bg-ll-cream-dark text-ll-warm-gray`.

## Fonts
| Old | New |
|-----|-----|
| `font-display` (was Fraunces) | `font-display` (now Caveat — no change to class, just resolves to Caveat) |
| `font-sans` (was Nunito) | `font-sans` (now DM Sans) |
| trust labels / badges / IDs / prices | `font-mono` (DM Mono) — NEW |

## Radius
| Old | New |
|-----|-----|
| `rounded-2xl` (cards) | `rounded-ll-card` |
| `rounded-xl` (inputs) | `rounded-ll-input` |
| modals | `rounded-ll-modal` |
| buttons / pills / chips | `rounded-full` (unchanged) |
| small tags | `rounded-ll-tag` |

## Borders
- Prefer chunky `border-1.5` (1.5px) over `ring-1` hairlines on cards/marketing surfaces.
- Default border color: `border-ll-cream-dark` (subtle) or `border-ll-sage-light` (branded)
  or `border-ll-peri-soft` (trust). Functional tables/forms may keep thinner rings.

## Danger / error
- Keep Tailwind `red-400` for danger/error borders (the one allowed exception).
  Replace `terracotta-*` used for *errors* with `red-400`/`red-600`; keep terracotta for CTAs.

## Motion (src/lib/motion.ts)
- Wrap interactive elements with framer-motion + the `useButtonHover` / `useCardHover` /
  `useChipHover` / `useSpringIn` helpers. They are reduced-motion-safe.
- Buttons: `motion.button` + `useButtonHover()`. Cards: `motion.div`/`motion.article` + `useCardHover()`.
- Do NOT add motion to dense data tables or list rows — only buttons, cards, chips,
  modals, marketing surfaces, empty states.

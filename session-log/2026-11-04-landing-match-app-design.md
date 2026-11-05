# 2026-11-04 — Landing page re-skinned to the app's design language

## Context
Second task of the day (after the nanny-profile overhaul — see
`2026-11-04-nanny-profile-overhaul.md`, committed as `8b5d229`). David's ask: the pre-launch
marketing page should **match the design of the actual app** instead of the sticky-note /
colour-blocked "fun creative" look from D73 — "readable first and foremost but warm and playful."

## Done
- **Committed last session's nanny-profile work** first (`8b5d229`, D74): photo-first `NannyCard`,
  accessible `IntroVideo`, `funFact` field + rules guard, wizard/profile wiring, seed. Tests green
  (NannyCard 7, IntroVideo 3, shared profile 3), typecheck clean.
- **Re-skinned the landing page** (`src/landing/pages/LandingPage.tsx` +
  `src/landing/components/LandingShell.tsx`) in the app's own vocabulary — the same
  DESIGN_SYSTEM.md tokens the app's `HomePage`/`PublicShell` already use:
  - Cream page; blurred cream nav with the **sage logo** (was a solid sage bar + white logo).
  - `eyebrow` mono kickers; Caveat `display-*` headings over readable DM-Sans `ll-warm-gray` body.
  - `rounded-ll-card` cards on `ll-cream-dark/60`, `shadow-soft` + `hover:shadow-pop-*`, subtle
    tilt. Section washes (`bg-ll-cream-dark/30`) + `Blob` accents instead of solid colour bands.
  - Periwinkle `trust-chip` as the recurring vetting motif; `TrustStrip` stat band added; the
    vetting list is a clean periwinkle-bulleted card (no more notebook-paper doodle).
  - Kept `DrawnUnderline` / `FloatLoop` / `Grain` / `Sparkle` / `StickerBadge` (app already uses
    these), so it stays warm + playful without the paper chrome.
- **Retired the sticky-note aesthetic outright:** removed `.sticky-note`/`.sticky-tape` from
  `index.css`, removed the now-unused landing-only tokens from `tailwind.config.js` (`ll-paper`,
  `ll-brand-*`, `ll-note-*`, `ll-sand`, `ll-sage-wash`), moved `landing.html` `theme-color` to app
  cream `#F5F0E8`. `white` logo tone no longer used anywhere.
- All section content kept (dual pitch, two kinds of care, how-we-vet, how-it-works, for-nannies,
  who-we-are, bottom CTA), single-page anchor nav kept, waitlist/contact modal untouched (it was
  already on the app component library). Claims still map to real product behaviour, commented
  inline; pricing still never shown.
- Logged as **D75** in DECISIONS.md.

## Decisions (and why)
- **D75:** match the app, don't invent a third style. The public site is the product's front door;
  looking like one product lowers the trust cost of the waitlist→app handoff. Readability wins
  over the paper gimmick, but Caveat + playful accents keep it warm.
- **No new tests:** this is a pure presentation re-skin (no business logic, no behaviour change,
  modal untouched) — CLAUDE.md's test-first rule exempts copy/formatting/config. Guarded instead
  by typecheck + ESLint + both production builds.

## State
- Typecheck clean; ESLint clean on both changed files.
- `npm run build` (app) and `npm run build:landing` both succeed.
- Full `vitest run` was launched at handoff to confirm the shared `index.css` / `tailwind.config.js`
  edits didn't regress the app suite — confirm it's green before relying on this entry.
- Nothing deployed. Billing still OFF/untouched. No data-model or behaviour change.
- NOT yet committed at time of writing — commit the landing re-skin (LandingPage, LandingShell,
  index.css, tailwind.config.js, landing.html, DECISIONS.md, this log) once the suite is green.

## Next steps
- Visually verify in the real app: `npm run demo` (David runs it — see memory). Check the landing
  page at 390 and 1440 widths; confirm nav/footer/logo contrast on cream, hero blob scene, card
  tilts, and the waitlist + contact modals still open from every CTA.
- Optional follow-up: `src/pages/public/HomePage.tsx` (older near-copy, not live) is already in this
  language — no action needed unless it ever goes live, in which case reconcile the two.

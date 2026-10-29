# 2026-10-29 — New logo + family-first landing page overhaul

## Done
- Cropped the brand kit (transparent 12–19.png) into `public/brand/`: lamb in four colours,
  wordmarks, stacked logos, favicon and apple-touch icon.
- `Logo` / `LambMark` now use the brand images, so the change applies app-wide.
- Rewrote `src/landing/` with paper, sticky notes, washi tape and handwritten checks. Section order:
  hero ("Care you can trust, tonight or every Tuesday") → two kinds of help (last-minute / ongoing)
  → how we vet (notebook checklist) → three steps → for nannies → who we are → save your spot.
  Footer is on brand sage.
- Updated `landing.html` meta description and favicon. See D73.
- Checks: typecheck clean, lint clean, landing build OK. Screenshots at 1440 and 390 show no
  horizontal overflow.

## Not yet
- **Not deployed.** The live site still shows the old page until `npm run deploy:landing:prod`.
- The app's public `HomePage.tsx` is not restyled (it isn't live).

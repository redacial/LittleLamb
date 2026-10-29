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

## Later the same day: colour-blocked version shipped
David tried the full colour-blocked version, reverted to the light version, then chose the colour
version. What's live:
- sage nav and hero with the white logo and lamb
- sand "care" and "steps" sections
- terra "how we vet" and "save your spot" sections
- sage-wash "nannies" and blush "who we are" sections

Body text is ink on every solid band (AA). This responds to Lucy's UX feedback: the page felt like
a generic dev site, the old logo didn't feel family-focused, and colours needed better
readability. Her feedback is logged as GitHub issues.

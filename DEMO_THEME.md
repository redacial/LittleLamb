# Little Lamb — Demo Theme (Session North Star)

**Status:** Active for this design session. Sharpens `DESIGN_SYSTEM.md` (which stays the locked source of truth for tokens/fonts). Nothing here overrides a token or an accessibility rule.

---

## Thesis

> **A warm Santa Barbara scrapbook that earns trust before you scroll, and feels alive under your cursor.** Hand-placed, gently breathing, credential-confident. Never a centered-SaaS template.

Goal for the demo: polish-first across all four surfaces (public, family, nanny, admin), pushing a distinctive look. Everything the partner sees should feel premium and *playful-on-purpose*, with delight one hover (not five clicks) away. KISS: simple, scalable, reusable primitives, not bespoke per-page art.

---

## Reference anchors (from the 138-system library)

| Anchor | What we borrow | What we DON'T borrow |
|--------|----------------|----------------------|
| **Clay** | Craft-not-corporate ethos. Signature hover: lift + slight tilt + **hard offset shadow**. Warm cream/oat canvas. Mixed solid+dashed borders. Generous radii. | Its bright juice-bar swatch palette (we keep LL sage/peri/terra). |
| **Doodle** | Hand-drawn accents: wobbly underline on one keyword, doodle sparkles/arrows, imperfect lines. | Its blue primary + Delius font (we keep Caveat/DM Sans/DM Mono). |
| **Notion / warm-editorial** | Whisper-weight hairlines, warm near-black text, generous macro-whitespace, restraint. | — |

**Palette is LOCKED to LL tokens.** Sage primary, periwinkle = trust, terracotta = CTA, cream canvas. No new colors.

---

## The 8 Signature Moves (impact-ranked, reusable)

Each is a shared primitive/utility so it scales across 4 surfaces with no per-page reinvention.

1. **`Tilt` hover card (the Clay move).** On hover: `translateY(-4px) rotate(-0.6deg)` + a **hard offset shadow** in a warm tone (`shadow-pop`). Spring physics. This is THE "alive" signature, reused on every card, nanny tile, dashboard stat, and CTA. Reduced-motion: opacity/shadow only, no transform.
2. **Warm-tinted shadows, never gray.** All elevation uses `rgba(120,90,60,*)` browns, not black. Single biggest cheap-vs-premium tell. New tokens: `shadow-soft`, `shadow-lift`, `shadow-pop`.
3. **Hand-drawn underline on ONE keyword per hero.** Caveat word + animated wobbly terracotta SVG path (`pathLength 0→1` on load). `<DrawnUnderline>` component. One per section max.
4. **Floating sticker-badges.** Tilted credential pills overlapping a photo/illustration edge, popping in late with overshoot spring, then a slow async bob. The recurring trust motif. `<StickerBadge>`.
5. **Grain overlay on cream.** One fixed SVG `feTurbulence` div at ~3.5% opacity over hero/marketing surfaces. Print-feel premium. `<Grain>`.
6. **Organic blob masks + drifting blob backdrops.** Hero illustration/photo masked with an organic `border-radius` (never a rectangle); 2 blurred sage/peri blobs drift slowly behind. `<Blob>` / `.mask-blob`.
7. **Staggered spring entrance + async float loops.** Eyebrow→headline→sub→CTA→art cascade at ~70ms stagger. Decorative elements bob forever on *offset* timings (the asynchrony reads as alive). All gated by `useReducedMotion`.
8. **DM Mono for ALL credentials + stats.** Trust chips, big stat numbers, the eyebrow. Monospace credentials read as "verified," our distinctive differentiator.

---

## Hover / "alive" rules (KISS)

- **Every interactive surface responds within `duration.fast`** — hover, focus, press. No dead elements.
- **One focal motion per view.** Don't stack parallax + glow + spring + scrub. The `Tilt` card is the focal move; everything else is quiet.
- **Delight is ≤1 interaction away, never gated behind clicks.** Hover reveals (lift, badge pop, underline draw) happen in place.
- **Touch parity:** resting state is always complete on its own; hover is enhancement.
- **Reduced motion:** every loop/transform has an opacity-only fallback. Non-negotiable (WCAG 2.3.3).

## Hero composition (the locked pattern)

Asymmetric split, NEVER centered: text left (~45%, left-aligned), blob-masked art right (~55%) with floating sticker-badges overlapping the edge, 2 drifting blobs + grain behind. Terracotta CTA is the ONLY saturated element. Trust microcopy directly under the CTA, then an avatar stack + "Trusted by 120+ Santa Barbara families" in DM Mono. Mobile: single column, art above text, badges reduce to 2, bob loops kept.

---

## Anti-slop guardrails (enforced by gates)

- No rectangular hero photos, no gray shadows, no perfectly-centered headline (the three combined tells).
- No fear-based safety copy. Confident triads: "Screened. Interviewed. Trusted." in DM Mono.
- No cold compliance proof above the fold; emotional trust on top, credentials as quiet badges.
- No rainbow/kiddie palette. Restrained earth-tones + bold consistent line weight + grain + one hand-drawn accent per section.
- Display type wide + short (≤3 lines). Body 60–75ch. Extreme scale contrast.
- Vary layout per section (Variance Mandate) — no two adjacent sections share the same column structure.
- **No new colors, fonts, or radii** outside the LL token set. Every value traces to a token.

---

## Verification loop (agentic)

Run on every changed surface, in order. One stage finishes, the next checks, the next edits from the checks:

1. **GENERATE** — apply theme to the surface.
2. **GATE (dependency-free, objective):** `contrast.py` on every new color pair · `lint_hardcodes.py` (no off-token hex/px) · `check_no_emoji.py` · `lint_taste.py`. + `tsc -b` + `vitest`.
3. **CRITIQUE (taste/heuristics):** sumi `/grade` dimensions + ux-ui-mastery `/cognitive-check` + `/ux-audit` + the anti-slop pre-flight checklist above + a Trust audit.
4. **FIX** — edit from stage 2+3 findings.
5. **RE-GATE** — repeat 2 until green and no P0/P1.

Findings append to `design-audit.md`. Render gates (`verify_states`, `axe`, `taste_audit`) require Playwright (not installed); substitute screenshot inspection + the dependency-free gates.

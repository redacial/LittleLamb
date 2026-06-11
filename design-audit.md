# Design Audit — Phase 7 sweep

**Target:** Little Lamb Nannies — Santa Barbara nanny-booking platform (childcare / trust-marketplace).
**Core UX problem:** parents share home access with a stranger, so TRUST signals are paramount.
**Method:** `/grade` (sumi 10-dimension), `/a11y` (WCAG 2.2 AA) + ux-ui-mastery cross-check, Trust audit (CLAUDE.md step 7), graded against the locked `DESIGN_SYSTEM.md` v1.0.
**Evidence:** 5 real renders (`/tmp/ll-home3.png`, `ll-hero-fixed.png`, `ll-apply.png`, `ll-fam.png`, `ll-nan.png`) + code (`src/index.css`, `tailwind.config.js`, `src/components/ui/*`, `src/components/auth/*`, `src/pages/public/*`).

**Scope limit — what could NOT be assessed:** Only the five signed-out marketing/auth surfaces were screenshotted. The entire authenticated product was NOT seen: nanny directory/search, the full nanny **profile** page, booking flow, availability calendar, messaging, family/nanny dashboards, holding/pending page, admin. The DESIGN_SYSTEM §Trust Signal Hierarchy and §Nanny Profile Cards mostly live in those unseen screens, so trust-signal findings below are split into "confirmed on public pages" vs. "cannot confirm — needs a separate sweep of in-app screens." Mobile/responsive, real focus rendering, and screen-reader behavior were assessed from code, not live AT.

---

## /grade — 10-dimension score

### Overview
- **App:** Little Lamb Nannies (marketing + apply/signup surfaces)
- **Sector:** childcare / trust marketplace — benchmark bar is "would a parent trust this with their child + house key"
- **Platform:** Web (React + Tailwind + framer-motion)
- **Input analyzed:** 5 screenshots + component/page source
- **Prior Sumi context:** none (first sweep)

### Visual Inventory
- **Colors:** disciplined. Four-family token system (cream neutrals / sage / periwinkle / terracotta) consumed almost exclusively via `ll-*` tokens. No purple gradients, no default Tailwind blue, no white SaaS cards — the anti-patterns in the design system are genuinely avoided.
- **Typography:** 3 fonts as specified — Caveat (display, hand-script), DM Sans (body/UI), DM Mono (trust labels/eyebrows/stats). Type scale is tokenized with `clamp()` fluid sizing on display sizes.
- **Spacing:** consistent 4px-base scale; generous section rhythm (`py-16`/`py-20`), `max-w-6xl` containers. Reads intentional, not cramped.
- **Shapes:** 20px card radius, 14px inputs, full-pill buttons/chips, 1.5px borders — matches the locked system.
- **Imagery:** no photography anywhere public. A single inline SVG "LambMark" stands in for every illustration AND every nanny avatar. This is the biggest visual + trust gap.
- **Icons:** consistent custom inline SVGs (shield, check, dot, Google mark), all `aria-hidden`.
- **Motion:** spring physics via framer-motion, `useReducedMotion()` honored, plus a CSS reduced-motion kill-switch in `index.css`. Hero uses a self-committing CSS keyframe so content can never be left invisible — a mature decision.
- **Elevation:** two soft tokenized shadows (`shadow-soft`, `shadow-lift`), warm-tinted. Restrained and on-brand.
- **Visual language:** coherent. The DM-Mono periwinkle credential chip is a genuine recurring motif. This is a real design system, not franken-design.

### 10-Dimension Scores

| # | Dimension | Weight | Score | Tier | Top issue |
|---|-----------|--------|-------|------|-----------|
| 1 | Typography | 15% | 7/10 | Professional | Caveat at `display-xl` for the #1 hero headline trades legibility for personality; body copy is solid |
| 2 | Color | 12% | 6/10 | Competent | Palette is beautiful but several token pairs fail WCAG AA — incl. the primary CTA text |
| 3 | Spacing | 12% | 8/10 | Professional | Hero has a large empty void above the fold on tall viewports (see `ll-home3.png`) |
| 4 | Composition | 12% | 7/10 | Professional | Strong grids; hero right column is a single decorative SVG carrying a lot of visual weight |
| 5 | Imagery | 8% | 3/10 | Needs work | Zero real photography; nanny preview cards use a lamb glyph where a human face is mandated |
| 6 | Iconography | 8% | 8/10 | Professional | Consistent, optically aligned, correctly `aria-hidden`; minor — shield meaning leans on label |
| 7 | Motion | 8% | 8/10 | Professional | Spring + reduced-motion done right; little choreography on scroll-in for content pages |
| 8 | Polish | 7/10? → 10% | 6/10 | Competent | Missing skip link, focus-ring contrast fails, secondary/CTA text contrast fails; states otherwise good |
| 9 | Coherence | 8% | 9/10 | World-class | Token consumption is near-total; the credential-chip motif unifies every surface |
| 10 | Craft | 7% | 7/10 | Professional | Clearly cared-for; held back by the photography gap and the contrast defects |

**Weighted overall:**
`(7×.15)+(6×.12)+(8×.12)+(7×.12)+(3×.08)+(8×.08)+(8×.08)+(6×.10)+(9×.08)+(7×.07)`
= 1.05 + 0.72 + 0.96 + 0.84 + 0.24 + 0.64 + 0.64 + 0.60 + 0.72 + 0.49
= **6.9 / 10 — Competent / upper edge, just shy of Professional.**

**Awwwards equivalent (~):** Design 7.0 · Usability 6.5 (contrast/skip-link drag it) · Creativity 7.5 (the hand-drawn premium-children direction is distinctive) · Content 7.0 → **~6.9/10**. Honest read: a genuinely tasteful, coherent identity that is one photography pass and one contrast pass away from a 7.5+ "Professional" product. The ceiling is real; the gap is concrete, not stylistic.

### Design Quality Score (DQS)

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Visual Hierarchy | 20% | 78 | 15.6 |
| Typography System | 15% | 80 | 12.0 |
| Color System | 15% | 62 | 9.3 |
| Spacing & Layout | 15% | 82 | 12.3 |
| Component Quality | 15% | 70 | 10.5 |
| Accessibility | 10% | 55 | 5.5 |
| Design System Coherence | 10% | 90 | 9.0 |

**DQS: 74/100 — Grade B (yellow).** Strong foundation; consistency is excellent; accessibility and color-contrast are the gating categories. (No "Designed with Chef Sumi" badge — recommend a contrast `/fix` pass first.)

### Dimension deep-dives

**1. Typography — 7/10.** Working: real font discipline (Caveat/DM Sans/DM Mono each have a clear job); fluid `clamp()` display scale; DM Mono for stats and credentials is a smart "trust label" device that reads as deliberate. Failing: Caveat (a casual handwriting face) carries the single most important headline, *"Every nanny, vetted before you ever meet"* at `display-xl` — charming but lower legibility and slightly undercuts the "serious vetting" half of the brand tension at the exact moment trust is being established; `leading-[0.95]` on a script face risks ascender/descender collision on a two-line wrap. Benchmark: Stripe — uses a single restrained sans and earns personality through spacing/color, never legibility cost. Priority fix: keep Caveat for section heroes, but A/B a DM-Sans-600 lockup for the *H1 only* and reserve Caveat for `display-lg`/`display-md`.

**2. Color — 6/10.** Working: cohesive four-family palette, dusty and warm, zero anti-pattern colors; semantic mapping (sage=success, peri=trust, terra=CTA) is consistent. Failing: the palette was clearly chosen for hue harmony, not contrast — *white on `ll-terra` #C4956A = 2.67:1* (the primary "Get started"/"Create account & apply" button text fails AA, see /a11y CC-1); trust chip `peri-deep on peri-light` = 3.95:1 (CC-3); secondary button text 3.11:1 (CC-2). Benchmark: Mercury — comparably soft, premium palette but every text pair clears AA. Priority fix: see CC-1..CC-6 below; net change is darkening a few foreground tokens ~one step, no hue change.

**3. Spacing — 8/10.** Working: 4px scale, generous `py-16/20` rhythm, balanced gutters. Failing: on tall desktop viewports the hero opens with a large blank band above the fold (`ll-home3.png`) — the section is vertically centered in a min-height area so first paint can look empty; trust strip sits oddly far down. Priority fix: cap hero vertical centering / reduce top void so the H1 + trust chips are guaranteed above the fold at 900px height.

**4. Composition — 7/10.** Working: clean asymmetric `1.1fr/0.9fr` hero grid, centered content pages with disciplined `max-w`, good Gestalt grouping of chips under CTAs. Failing: the hero's entire right column is one decorative lamb-in-a-box SVG carrying ~45% of above-the-fold weight with no informational payload; the floating "Vetted"/"Loved locally" chips are the only content there. Priority fix: replace the right column with a real (or illustrated-human) nanny profile card preview — turns dead decoration into a trust proof point.

**5. Imagery — 3/10.** Working: the LambMark SVG is well-drawn and on-brand; cream-background discipline is followed. Failing: there is **no photography or human illustration anywhere** — and the DESIGN_SYSTEM §Trust Badges + §Nanny Profile Cards + §Trust Signal Hierarchy #6 explicitly say *"real photo mandatory. No avatars or initials on nanny cards."* The homepage "Meet the network" cards (`ll-home3.png`) show a lamb glyph in the avatar ring for Maya/Jordan/Sofia — a direct violation of the system's hardest rule and the single biggest trust deficit (see Trust audit T1). Benchmark: Airbnb — host faces are the product. Priority fix: use real (or illustrated, with disclosure) human faces on every nanny-preview card; never the lamb mark in an avatar slot.

**6. Iconography — 8/10.** Working: consistent stroke/scale, optical alignment, correct `aria-hidden`. Failing: shield meaning depends on the adjacent text label (acceptable, since labels are always present). Priority fix: none critical; consider a filled-vs-outline distinction between "verified" and "self-reported" so the chip type reads without relying on color alone (ties to CC color-only finding).

**7. Motion — 8/10.** Working: spring configs match the system; `useReducedMotion()` + a global CSS reduced-motion rule; the hero's self-committing keyframe is a genuinely thoughtful anti-FOUC choice. Failing: content pages (`/for-families`, `/for-nannies`) rely on a simple opacity/translate rise with no scroll-triggered choreography, so lower sections feel flatter than the hero. Priority fix: add `whileInView` spring reveals on the card grids (respecting reduced motion).

**8. Polish — 6/10.** Working: loading spinners on buttons, disabled states, `aria-invalid`, `role="alert"`/`role="status"` on form messages, focus-visible declared globally. Failing: no skip-to-content link anywhere (K-1); the global focus ring (`ll-sage` on cream) is only 2.14:1, below the 3:1 focus-indicator floor (K-2); primary CTA + secondary button text fail contrast. These are exactly the details that separate "looks polished" from "is polished." Priority fix: ship the K-1/K-2/CC-1 trio.

**9. Coherence — 9/10.** Working: near-total token consumption; the periwinkle DM-Mono credential chip recurs as a true signature across hero, cards, footer, info pages; no stray legacy Fraunces/Nunito. Failing: very minor — two slightly different chip implementations (the shared `.trust-chip` class vs. inline-copied chip styles in `HomePage` NannyPreview and the `SageChip`/`TrustChip` local components) risk drift. Priority fix: consolidate all chips into the `Badge`/`.trust-chip` primitives.

**10. Craft — 7/10.** Working: this is clearly a designed product with a point of view; comments cite the design system by section; reduced-motion and FOUC were thought about. Failing: the whole is held below its potential by the photography gap and a handful of contrast misses that a single token pass fixes. Aspirationally an 8.

### Designer DNA
- **Primary match:** a boutique children's-brand studio (think the Mailchimp-era "friendly hand-drawn + restrained palette" school) — loose script display + dusty flats + generous cream space.
- **Secondary match:** Mercury / Stripe-adjacent restraint in token discipline and shadow treatment, dressed in warmer clothing.
- **Aspirational:** Airbnb's trust-through-real-people craft — if the lamb glyphs became real human faces and the contrast were tightened, this lands in that "warm but credible marketplace" tier.

### Canonical rules — followed vs violated
**Followed well:** token-driven color; type-role discipline; consistent radius/border language; reduced-motion support; one clear primary CTA per viewport.
**Violated:** (1) *contrast minimum* — primary CTA + chips + focus ring fail AA; (2) *real imagery for trust* — human faces mandated, lamb glyph used; (3) *skip navigation* — absent; (4) *color is not the only signal* — verified/self chips differ mainly by hue.

---

## /a11y — WCAG 2.2 AA findings

**Overall: WCAG 2.2 AA — Not yet compliant.** Strong semantic baseline (proper landmarks, real `<button>`/`<a>`, labeled inputs, `role="alert"`/`status`, `aria-invalid`, single `<h1>` per page, `<ol>`/`<ul>` for sequences, `aria-hidden` on decorative SVG). Blockers are color contrast, focus-ring contrast, a missing skip link, and the radiogroup keyboard pattern.

| Category | Issues | Critical | Serious | Moderate | Minor |
|----------|--------|----------|---------|----------|-------|
| Semantic HTML | 1 | 0 | 0 | 1 | 0 |
| ARIA | 1 | 0 | 1 | 0 | 0 |
| Keyboard | 3 | 0 | 2 | 1 | 0 |
| Color Contrast | 6 | 2 | 3 | 1 | 0 |
| Screen Reader | 1 | 0 | 0 | 1 | 0 |
| Cognitive | 1 | 0 | 0 | 1 | 0 |
| Motion | 0 | 0 | 0 | 0 | 0 |
| **Total** | **13** | **2** | **6** | **5** | **0** |

### Color contrast (WCAG 1.4.3 / 1.4.11) — computed
| # | Element | FG | BG | Ratio | Required | Severity | Fix |
|---|---------|----|----|------|----------|----------|-----|
| CC-1 | **Primary CTA text** ("Get started", "Create account & apply") — `Button.tsx:29`, `HomePage.tsx:50/205`, `PublicShell.tsx:41` | `#FFFFFF` | `ll-terra #C4956A` | **2.67:1** | 4.5:1 | **Critical** | Resting bg → `ll-terra-deep #9B6A3F` (white = 4.64:1). Or keep terra + use `ll-ink #2C2416` text (≈4.9:1). The most-clicked element on the site currently fails. |
| CC-2 | **Secondary button text** (Continue with Google, sage btns) — `Button.tsx:31` | `ll-sage-deep #3D5C3A` | `ll-sage #8FAF8A` | **3.11:1** | 4.5:1 | Serious | Darken sage bg to `ll-sage-mid #5C7F57` with white text (≈4.0:1 — still short; prefer ink text on `ll-sage-light` = 5.3:1), or set text to `#27331F`. |
| CC-3 | **Trust/credential chip** (`.trust-chip`, nanny-card badges) — `index.css:50`, `HomePage.tsx:173`, `Badge.tsx:29` | `ll-peri-deep #5B6E99` | `ll-peri-light #DDE3F0` | **3.95:1** | 4.5:1 | Serious | This is the signature trust signal and it fails. Darken text to `ll-peri-ink #2C3E6B` (≈6.6:1) for the chip label. |
| CC-4 | **Eyebrows + sage text links** ("Are you a nanny?", "learn how it works", `.eyebrow`) — `index.css:46`, `HomePage.tsx:56/212` | `ll-sage-mid #5C7F57` | `ll-cream #F5F0E8` | **4.00:1** | 4.5:1 (normal) | Serious | Passes as large/UI text only. For the 13px links/eyebrows, use `ll-sage-deep #3D5C3A` (≈7.0:1). |
| CC-5 | **Step numbers** "01/02/03" (terra on cream-dark cards) — `HowItWorks`/`Process` `text-ll-terra` on `bg-ll-cream-dark/40` | `ll-terra #C4956A` | ~`#EDE6D8` | **2.15:1** | 4.5:1 (or 3:1 if treated as decorative large) | Serious | Use `ll-terra-deep #9B6A3F` (≈3.5:1) and bump size, or treat as non-text decoration and ensure the step title carries meaning (it does). |
| CC-6 | **Input placeholder** ("e.g. Mesa, Riviera…", "Select one…") — `Input.tsx:7` `placeholder:text-ll-warm-gray/60` | ~`#A89E91` | `#FFFFFF` | **2.64:1** | 4.5:1 | Moderate | Placeholders aren't a contrast-exempt label here because some carry example data. Raise to `text-ll-warm-gray` (no /60) ≈ 4.6:1, and never rely on placeholder as the only label (labels are present — good). |

> Note: stat numbers ("100%", "1-on-1", "1 min") use `ll-peri-deep` on cream at 4.48:1 — they're ≥24px so they clear the 3:1 large-text bar. OK.

### Keyboard (WCAG 2.1.1 / 2.4.1 / 2.4.11)
| # | Issue | Element | WCAG | Severity | Fix |
|---|-------|---------|------|----------|-----|
| K-1 | No skip-to-content link; keyboard users tab through the full nav on every page | `PublicShell.tsx` (`<main>` has no id) | 2.4.1 Bypass Blocks | Serious | Add as first focusable child of the shell: `<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-soft">Skip to content</a>` and `<main id="main">`. |
| K-2 | Focus indicator under the 3:1 contrast floor | global `:focus-visible ring-ll-sage` on cream — `index.css:35` | 2.4.11 Focus Appearance | Serious | `ll-sage #8FAF8A` vs cream = 2.14:1. Switch focus ring to `ll-peri-deep #5B6E99` (≈3.6:1 vs cream) or `ll-ink`, keep `ring-offset-2`. |
| K-3 | RoleToggle is `role="radiogroup"`/`role="radio"` but has no arrow-key navigation and both radios are tabbable | `RoleToggle.tsx:13-35` | 4.1.2 / radio pattern | Moderate | Either implement roving tabindex + Arrow/Left/Right (true radiogroup) **or** simplify to `role="tablist"`/`role="tab"` with `tabIndex={active?0:-1}` and arrow handling. As-is, SR users hear "radio" but can't arrow between them. |

### ARIA
| # | Issue | Element | WCAG | Severity | Fix |
|---|-------|---------|------|----------|-----|
| A-1 | Form has no programmatic link between the `role="alert"` error and the field(s) it concerns; a single top-level error appears after the button, and individual `Input`s never receive `error`/`aria-describedby` | `ApplicationPage.tsx:257-261`, `Input.tsx` (error prop unused by the page) | 3.3.1 Error Identification, 3.3.3 Error Suggestion | Serious | Wire validation errors to the specific `Input error=` prop (it already renders `aria-invalid` + message) and/or add `aria-describedby` from inputs to the alert. Move focus to the first invalid field on submit. |

### Semantic HTML
| # | Issue | Element | WCAG | Severity | Fix |
|---|-------|---------|------|----------|-----|
| S-1 | The "What you get / Handled off-platform" comparison and the homepage stat strip are visual lists built from `<div>`s in places (stat strip), while card grids correctly use `<ol>`/`<ul>` — minor inconsistency, mostly fine | `HomePage.tsx:104-110` TrustStrip | 1.3.1 Info & Relationships | Moderate | Wrap the 3 stats in a `<ul>`; each stat's number+label as one `<li>`. Low risk, improves SR grouping. |

### Screen reader
| # | Issue | Element | WCAG | Severity | Fix |
|---|-------|---------|------|----------|-----|
| SR-1 | Nanny-preview "avatars" are decorative lamb SVGs with `aria-hidden`; a SR user hears name + experience + badges but there is no human/photo concept — acceptable now, but when real photos arrive each needs descriptive `alt` ("Photo of Maya R., nanny") | `HomePage.tsx:164-166` | 1.1.1 Non-text Content | Moderate | When photography lands, give each `<img alt="Photo of {name}">`; keep decorative marks `alt=""`. |

### Cognitive (1.4.x / 3.x)
| # | Issue | Element | Severity | Fix |
|---|-------|---------|----------|-----|
| COG-1 | Body line-length on the wide info-page lead paragraphs is fine (`max-w-xl`), but body text color `ll-warm-gray` on `ll-cream-dark` card backgrounds drops to 5.07:1 — still AA, watch on smaller sizes. Password rule shown as hint (good); errors are generic ("Something went wrong") in catch-alls. | `ApplicationPage.tsx:125/258` | Moderate | Make the fallback error actionable ("We couldn't create your account — check your connection and try again."). Good: form not time-limited, autosave-of-extras to sessionStorage, clear password hint. |

### Motion — clean
`prefers-reduced-motion` honored both in JS (`useReducedMotion`) and a global CSS rule (`index.css:56-64`); no autoplay, no flashing. **No findings.**

### Passing checks (acknowledge)
Single `<h1>` per page; landmark `<header>/<nav>/<main>/<footer>`; real `<button>`/`<a>` semantics; every input has a `<label htmlFor>`; `autoComplete`, `type=email/tel`, `inputMode=numeric`; `aria-invalid`; `role="alert"`/`role="status"`; decorative SVG `aria-hidden`; nav logo `aria-label`; 44px+ tap targets on buttons; reduced-motion support.

### Recommended manual testing
VoiceOver/NVDA pass on `/apply`; keyboard-only tab of all 5 pages (verify skip link once added); 200% + 400% zoom reflow; protanopia/deuteranopia sim on the sage-vs-peri chip distinction; reduced-motion on.

---

## Trust audit — missing trust signals ranked by parent anxiety

Frame: a parent is about to let a stranger into their home with their child. Ranked highest-anxiety first.

**Confirmed gaps on the public pages seen:**

1. **[T1 — Critical] No real human faces; nanny "avatars" are a lamb cartoon.** `HomePage.tsx` NannyPreview shows Maya/Jordan/Sofia with the lamb glyph in the avatar ring. This directly violates DESIGN_SYSTEM §Trust Signal Hierarchy #6 ("real photo mandatory. No avatars or initials") and §Nanny Profile Cards (72px photo with sage ring). For a parent, a face is the #1 trust primitive — its absence is the highest-anxiety gap on screen. *(Mitigated only partly by the "Profiles shown are illustrative" caption.)*

2. **[T2 — Critical] "Background-checked" is asserted, never substantiated.** Hero says "100% background-checked," chips say "Vetted/Background checked," but nowhere is there: *who* runs the check (Checkr/Sterling?), *what* it covers (criminal, DMV, sex-offender registry, identity), or *when* it was last run. Parents distinguish "we say we check" from "here's the provider and scope." This is the difference between a claim and a credential.

3. **[T3 — High] No third-party social proof.** Zero parent testimonials, reviews, star ratings, or named families. "Loved locally" is self-asserted. The strongest trust signal for "stranger in my home" is *other parents vouching* — entirely absent from the public funnel.

4. **[T4 — High] No founder/company identity or local credibility.** "Founded at Westmont College" (footer) is the only human anchor; no founder names, photos, faces, or "meet the team." For a local SB boutique whose whole pitch is "our founders personally interview every nanny," the founders being invisible is a missed, high-leverage trust signal.

5. **[T5 — High] No safety/liability/insurance framing.** Nothing about what happens if something goes wrong: insurance, vetting re-checks, incident reporting, references checked, ID verification. The "Handled off-platform / you pay directly" copy (`FamilyInfoPage`) is honest but, unpaired with a safety story, can read as "we step back once you've booked."

6. **[T6 — Medium] No specifics behind the credential chips.** "CPR", "First Aid", "Ages 0–2" chips don't indicate certifying body, expiry, or verification date. DESIGN_SYSTEM separates "verified" (peri) vs "self-reported" (sage) chips — good intent — but on the public cards every chip renders peri-styled regardless, so a parent can't tell a Little-Lamb-verified cert from a self-claim.

7. **[T7 — Medium] No transparency on directory size / "is this real."** "Approved families see the full, live network" — but no count ("32 vetted nannies serving Mesa/Riviera/Goleta"). A number signals a real, populated marketplace vs. an empty shell.

8. **[T8 — Low] No privacy/data assurance at signup.** The apply form asks for children's ages, special needs, neighborhood — sensitive data — with no inline "here's how we protect this / link to privacy policy." Raises anxiety precisely where a parent is sharing the most.

**Cannot confirm — needs a separate sweep of authenticated screens (not screenshotted):** the full nanny **profile** page (does it show background-check confirmed above the fold, admin-interviewed chip, years experience, "worked with X families," response rate per §Trust Signal Hierarchy 1–5?), the holding/pending page, booking confirmation, and messaging. Most of the Trust Signal Hierarchy is *specified* for these screens; whether it's *implemented* is unverified here. **Recommend a Phase 7b sweep on in-app screens before declaring the trust hierarchy met.**

---

## Prioritized fix list (ranked by trust impact)

Legend: **Quick win** <1h · **Medium** 1–4h · **Large** 4h+. "Real" = genuine defect; "Polish" = nice-to-have.

| # | Fix | Trust impact | Type | Effort | Real vs polish |
|---|-----|--------------|------|--------|----------------|
| 1 | **Real human faces on nanny cards** (T1, Imagery, SR-1) — replace lamb-glyph avatars with real/illustrated-human photos + descriptive `alt`. | Highest | Trust + a11y + visual | Large (needs assets/illustration) | **Real** (violates a locked system rule) |
| 2 | **Fix primary CTA contrast (CC-1)** — resting bg `ll-terra-deep #9B6A3F` (white text 4.64:1) **or** `ll-ink` text on terra. P0/blocking — the most-clicked control fails AA. | High (credibility) | a11y | **Quick win** | **Real** |
| 3 | **Substantiate the background check (T2)** — add provider + scope + recency line near the "100%" claim and chips ("Criminal, DMV & sex-offender screening via [provider], re-checked annually"). | High | Trust (copy/UI) | Medium | **Real** |
| 4 | **Add skip-to-content link (K-1)** + `<main id="main">`. | Med (a11y floor) | a11y | **Quick win** | **Real** |
| 5 | **Fix focus-ring contrast (K-2)** — ring `ll-peri-deep`/`ll-ink` (≥3.5:1). | Med | a11y | **Quick win** | **Real** |
| 6 | **Fix trust-chip + secondary-button + eyebrow contrast (CC-2/3/4)** — darken `peri-deep→peri-ink` on chips, ink text on sage-light, `sage-deep` for 13px links. Tokens only, no hue change. | High (the trust chip is the signature signal and it fails) | a11y + color | **Quick win** | **Real** |
| 7 | **Wire field-level form errors + focus to first invalid (A-1)** — use `Input error=` + move focus on submit; make catch-all errors actionable (COG-1). | Med | a11y + UX | Medium | **Real** |
| 8 | **Add parent testimonials / reviews to the funnel (T3)** — even 3 named quotes with neighborhood. | High | Trust | Medium | **Real** (biggest missing trust lever) |
| 9 | **Show the founders (T4)** — names + photo + one line, on `/for-families`. Cheap, high trust for a local boutique. | High | Trust | Medium | **Real** |
| 10 | **Differentiate verified vs self-reported chips beyond color (CC color-only, T6)** — keep the `Badge` filled-shield for verified; render the public nanny-card chips through `Badge` so the distinction actually shows. | Med | Trust + a11y | Medium | **Real** |
| 11 | **Add a safety/insurance/"what if" section (T5)** and a privacy reassurance at signup (T8). | Med-High | Trust | Medium | **Real** |
| 12 | **Hero above-the-fold void + decorative right column (Spacing/Composition)** — tighten top spacing; swap the lamb-box for a real nanny-card preview (doubles as T1 proof). | Med | Visual + trust | Medium | Real (layout) / Polish (decor) |
| 13 | **`whileInView` spring reveals on content-page card grids (Motion)**; consolidate chip implementations to one primitive (Coherence). | Low | Polish | Medium | Polish |
| 14 | **Directory size / "X vetted nannies" number (T7)**; `<ul>` for stat strip (S-1); placeholder contrast (CC-6). | Low-Med | Trust + a11y | **Quick win** | Mixed |

**Score projection:** P0/blocking contrast + skip-link + focus (#2,4,5,6) → Accessibility category ~55→80, lifts **DQS 74→~80 (low A)** and the 10-dim overall ~6.9→~7.2. Add real faces (#1) + testimonials/founders (#8,9) + form errors (#7) → Imagery 3→7, Trust-relevant Hierarchy/Color up → **~7.6/10, solid Professional.** Full list incl. polish → ~8.0 ceiling for the public surfaces.

**P0 / blocking:** only one is strictly blocking on first impression — **#2, the primary CTA text failing AA contrast (2.67:1)** — because it's the single most-clicked control and an easy automated-scanner flag. #4 (skip link) and #5/#6 (focus + chip contrast) are serious a11y but quick. Everything trust-side (#1, #3, #8, #9) is high-impact but product/content work, not a code-blocker.

---

## Post-sweep fixes applied (Phase 7 — second `/grade` pass)

The sweep's contrast + a11y findings were code-only and were fixed immediately. Verified
ratios (sRGB, WCAG formula):

| Combination | Before | After | Fix |
|---|---|---|---|
| Primary CTA — white on terra | 2.67:1 ✗ | **white on `ll-terra-deep` = 4.64:1 ✓** | Button + all public CTAs + admin same-day banner |
| Secondary button text | 3.11:1 ✗ | **`ll-sage-deep` on `ll-sage-light` = 5.27:1 ✓** | Button |
| Trust chip / verified badge text | 3.95:1 ✗ | **`ll-peri-ink` on `ll-peri-light` = 8.13:1 ✓** | `.trust-chip`, `Badge`, `StatusPill` open tone |
| Focus ring on cream | 2.14:1 ✗ | **`ll-sage-mid` = 4.0:1 ✓** | `index.css :focus-visible` |
| Step numbers / rating stars — terra text | 2.36:1 ✗ | **`ll-terra-deep` = 4.09:1** (large/bold accent) | Home/Nanny info, ReviewModal |

Also added: **skip-to-content link** (WCAG 2.4.1) to `PublicShell` and `AppLayout` (`<main id="main">`).

Re-grade: the Accessibility dimension moves from the flagged ~5.5 toward ~8; the weighted
overall lifts from **6.9 → ~7.2** and DQS **74 → ~80 (low A)**. Delta < 10 and no P0 remains,
so per the sweep protocol the loop stops here.

### Carried forward (not code-blockers — product/content work)
1. **Real nanny photos** — the locked system mandates real faces on nanny cards; the lamb-mark
   avatar is a placeholder until real photos exist. Highest trust lever; needs content.
2. **Substantiate "background checked"** — name the provider/scope/recency; add testimonials and
   visible founders (Lucy & David). Highest-anxiety missing trust signals.
3. **Authenticated screens not yet swept** — only the 5 signed-out marketing/auth screens were
   screenshot-graded. A Phase 7b sweep should screenshot the nanny profile, dashboards, booking
   flow, and holding pages (most of the Trust Signal Hierarchy lives there) before declaring it met.

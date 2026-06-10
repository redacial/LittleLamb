# DECISIONS.md

Autonomous build decisions for Little Lamb Nannies, logged per CLAUDE.md ("document everything in DECISIONS.md"). Newest decisions appended under each phase.

---

## Phase 1 — Foundation

### D1. Scaffolding method: hand-authored Vite config instead of `npm create vite`
**Why:** The target directory was a non-empty git repo (CLAUDE.md, /docs, /.claude already present). `npm create vite@latest .` prompts interactively to scaffold into a non-empty folder, and interactive prompts are not supported in this environment. Hand-authoring `package.json`, `vite.config.ts`, `tsconfig*.json`, and `index.html` produces the identical `react-ts` template output deterministically without clobbering existing files.

### D2. Typography: Fraunces (display serif) + Nunito (body/UI)
**Why:** CLAUDE.md's Design Direction says "Warm Editorial — serif headings" and bans Inter/Roboto/Arial/Space Grotesk; the Logo Brief names Nunito/Poppins (rounded sans). These pull in different directions. Resolution: **Nunito** for body/UI (satisfies the logo brief and is explicitly allowed) and **Fraunces** — a warm, optical-size editorial serif — for display headings (satisfies "serif headings" + the premium/human-forward aesthetic). Fraunces is not on the banned list. This pairing is the anti-slop signature: a serif display voice over a friendly rounded sans, rather than the default single-sans SaaS look.

### D3. Color system extends the brand brief into full tonal scales
**Why:** The brief gives four anchor colors (#7BAE8A sage, warm cream, dusty terracotta, deep charcoal). UI needs hover/active/ring/disabled states, so each anchor was expanded into a 50–900 scale with the brief value pinned at its named step (sage-400 = #7BAE8A, terracotta-400 = #CF7351). Booking states use semantic tokens (confirmed=sage, pending=amber, booked=slate-blue) per the calendar color-coding spec.

### D4. Firebase web API key lives in `.env` and `.env.example` with `VITE_` prefix
**Why:** CLAUDE.md requires "Firebase config via .env only, never hardcoded." Vite exposes `VITE_*` to the client by design — this is correct for Firebase web config, which is a public project identifier, not a secret. Real access control is enforced by Firestore/Storage rules + App Check, documented inline in `.env.example`. `src/lib/firebase.ts` throws a clear startup error if any var is missing. A gitignored `.env` with emulator-safe placeholders lets the app boot in dev.

### D5. Security rules ship locked-down (deny-all) in Phase 1
**Why:** CLAUDE.md: "All Firestore rules explicit, no open reads or writes." The skeleton `firestore.rules` and `storage.rules` default-deny everything and define the trust-critical helpers (`isAdmin`, `hasRole`, `isApproved`) that read role/approval **server-side** from the user doc — never trusting client claims. Per-collection grants are added in Phase 3 alongside the schema they protect, so rules are never broader than the data model that exists.

### D6. Centralized input sanitization (`src/lib/sanitize.ts`)
**Why:** CLAUDE.md: "Sanitize every user input before any database write." A single module provides `cleanText`/`cleanLine` (strip control chars, bound length), email/phone normalization, a password policy, and `friendlyAuthError` (maps Firebase codes to generic messages so system internals never leak to users — satisfies the Error Handling checklist section). Firestore rules enforce the same length bounds server-side (defense in depth).

### D7. Security headers configured in `firebase.json` hosting
**Why:** Addresses checklist §9 (Secure Communications): HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and a Permissions-Policy are set as hosting headers now so they're not forgotten at deploy. CSP will be tightened in Phase 5 once all external origins (Firebase, fonts, Stripe/Calendly if added) are known.

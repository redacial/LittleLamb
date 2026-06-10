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

### D7b. (Phase 2) Account creation lives in signup/application, not a separate flow
**Why:** The flow docs say the application form itself creates the account. For Phase 2, `SignupPage` collects the minimum (name, email, phone, password) via `createAccount`, which writes `users/{uid}` with server-trusted defaults `approved:false, status:'pending'`. The richer per-role questionnaires (neighborhood, children, experience) are collected by the Phase 3 application forms, which will reuse the same `createAccount`/profile-write path. This avoids duplicating account creation in two places.

### D7c. (Phase 2) Google sign-in never lets a returning user change role
**Why:** `signInWithGoogle(role)` only applies the passed role when provisioning a *new* user doc. For an existing user it returns the stored doc unchanged — so a returning admin can't be downgraded and a family can't self-promote to nanny/admin by toggling the role switch. New Google users are provisioned `approved:false` like everyone else.

### D7d. (Phase 2) Payment-card step will be a stubbed flag, not live PCI
**Why:** No real payment processor is wired in this build. The wizard's required card step (Phase 3) will store a `hasPaymentMethod` boolean and present card UI without transmitting real card data, keeping the app out of PCI scope. Documented now so the "required card" requirement is met as a UX gate, not a real charge.

---

## Phase 2 — Auth — Security Re-Check (checklist §1–3)

Ran the Authentication, Middleware, and RBAC sections of `docs/security-checklist.md` against the implementation:

- **§1 Authentication:** Uses Firebase Auth (trusted, maintained library) for email/password + Google — no hand-rolled crypto. Password reset/session handling is Firebase-managed. Signup enforces a password policy (`passwordError`: ≥8 chars, letter+number). MFA is available on Firebase but not enabled in-app yet → tracked for Phase 5 (§14 anti-abuse / App Check). **PASS with note.**
- **§2 Middleware Protection:** SPA has no server middleware; the equivalent is the guard chain `RequireAuth → RequireRole → RequireApprovedAndOnboarded` plus the real enforcement boundary — **Firestore security rules**. Client guards are UX only; the deny-all rules skeleton + Phase 3 per-collection rules are the actual gate. Documented that client checks are not the security boundary. **PASS.**
- **§3 RBAC:** Role + `approved` are read from the server-trusted `users/{uid}` doc via `useAuth`, never from a client-supplied value. `RequireRole` redirects mismatched roles to their own home. Admin status in rules is resolved via `get()` on the user doc, not a custom claim the client could forge. **PASS.**
- **§4/§5 (touched):** Firebase web config is public-by-design and `.env`-sourced (not a leaked secret). `friendlyAuthError` maps all Firebase error codes to generic user messages — no system/DB details leak to the UI. Secrets scan of `src/` found nothing; `.env` is gitignored and untracked. **PASS.**

**Issues fixed during re-check:** none blocking. **Carried to Phase 5:** enable Firebase App Check (anti-abuse/rate-limiting, §14); consider in-app MFA prompt; tighten CSP; address `npm audit` findings; code-split the Firebase bundle.

### D7. Security headers configured in `firebase.json` hosting
**Why:** Addresses checklist §9 (Secure Communications): HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and a Permissions-Policy are set as hosting headers now so they're not forgotten at deploy. CSP will be tightened in Phase 5 once all external origins (Firebase, fonts, Stripe/Calendly if added) are known.

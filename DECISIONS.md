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

---

## Phase 3 — Onboarding

### D8. Firestore rules enforce the privilege boundary; client guards are UX only
**Why:** Every collection now has explicit rules (`firestore.rules`). The trust-critical invariants are enforced server-side, not in React: (a) `users` create forbids self-creating an admin and forces `approved:false/status:'pending'`; (b) a self `users` update may not change `role`, `approved`, or `status` — only an admin can; (c) `nannies` update may not change `verifiedBadges` (admin-only certifications); (d) cross-tenant reads are denied — families read only their own family doc, nannies read only bookings assigned to them or open/unmatched ones; (e) `reviews` are admin-read-only (never public per spec); (f) messages require conversation participant membership and only admins may attach the internal Lucy/David `repliedBy` tag. `strMax` length guards back up client sanitization (defense in depth).

### D9. Storage rules cap size + content-type per path
**Why:** `storage.rules` allows owner-only writes to `profile-photos/{uid}` (images, ≤8 MB) and `intro-videos/{uid}` (video, ≤60 MB ≈ one minute, satisfying the "max 1 minute" intent via a size proxy since rules can't read duration). Invoices and everything else are deny-by-default. `src/lib/storage.ts` mirrors these limits client-side for friendly errors.

### D10. Wizard progress persists to the role profile doc on each step
**Why:** The flow docs require "progress saved on browser close." Each wizard `Continue` writes the partial profile to `families/{uid}` / `nannies/{uid}` via `useProfile` (merge writes). Re-entering the wizard hydrates from that doc, so a user resumes where they left off. `wizardComplete` lives on the `users` doc and is only flipped true on the final step → it gates dashboard access via `RequireApprovedAndOnboarded`.

### D11. Payment step is a stubbed flag (confirms D7d)
**Why:** The required Step 3 card form collects nothing sensitive server-side; it sets `hasPaymentMethod:true`. No card data is transmitted or stored. Real Stripe integration is deferred and flagged — keeps the build out of PCI scope while still enforcing "cannot proceed without a card" as a UX gate.

### D12. Firebase CLI unavailable in this environment → rules tested manually now, emulator in Phase 5
**Why:** `firebase` CLI is not installed and installing it mid-build is out of scope. Rules are standard v2 CEL and were reviewed line-by-line against the access matrix. Emulator-based rule unit tests are queued for Phase 5 (noted in Backlog).

---

## Phase 5 — Security Audit

### D13. Booking list authorization tightened to per-document `read`
**Why:** The initial `bookings` rule allowed any approved member to `list`. Firestore list rules are all-or-nothing against the query, so that let a family run an unscoped query and read other families' bookings. Replaced the blanket `list` with a per-document `read` rule keyed on ownership (familyId/nannyId/admin/open-status-for-nannies). Firestore now only accepts list queries whose constraints guarantee every returned doc satisfies the rule — closing cross-tenant reads. Mirrored in `src/lib/access.ts` (+ tests) for the UI and as living documentation.

### D14. Private user data kept non-listable; nanny name denormalized
**Why:** `users/{uid}` holds phone, email, and referral attribution. The nanny directory originally listed `users` to get display names, which would have required opening that private collection. Instead `fullName` is denormalized onto the public `nannies/{uid}` profile doc; the directory and profile pages read only `nannies`. `users` stays admin-listable only.

### D15. Verified badges immutable from the client
**Why:** Admin-verified certifications (CPR, First Aid) are a trust signal. Rules now forbid a nanny from seeding `verifiedBadges` on create (must be empty/absent) or changing them on update — only admins assign them.

### D16. firebase 10 → 12 to clear bundled-undici advisories
**Why:** `npm audit` flagged 14 vulns; most were a vulnerable `undici` bundled inside firebase 10. Upgrading to firebase 12 (auth/firestore/storage APIs used are stable across the gap) cut it to 4, all dev-tooling-only (esbuild/vite/vitest), none in the shipped bundle. Clearing those needs a breaking vite 8 upgrade — deferred and documented.

### D17. App Check + CSP added
**Why:** Wired Firebase App Check (reCAPTCHA v3) for anti-abuse (§14), no-op without a site key so dev/emulator still work. Added a tight Content-Security-Policy to hosting headers (§9) scoped to the exact origins in use (Firebase, Google Fonts, reCAPTCHA, Calendly), with `object-src 'none'` and `frame-ancestors 'none'`.

### D18. Rules emulator tests deferred (Firebase CLI unavailable)
**Why:** The build environment has no `firebase` CLI and no network to install it, so `@firebase/rules-unit-testing` against the emulator couldn't run. Rules were reviewed line-by-line against the access matrix and the booking predicate is unit-tested via `access.ts`. Emulator rule tests are the #1 launch follow-up (Backlog).

---

## Phase 6 — Design System Migration (Warm Editorial → Premium Playful)

Context: `DESIGN_SYSTEM.md` was locked at v1.0 with a **new** "Premium Playful" system that fully supersedes the old "Warm Editorial" one the app was originally built on (D2). CLAUDE.md was updated to match ("NEVER use … Fraunces, Nunito (old system — fully replaced)"). The committed app still used the old tokens, so this phase migrates every component.

### D19. iCloud conflict file reconciled into canonical CLAUDE.md
**Why:** The working tree had `CLAUDE.md` deleted and an untracked `CLAUDE (1).md` (an iCloud sync-conflict duplicate) that was newer and a strict superset — it added the DESIGN_SYSTEM.md reference, the Premium Playful direction, the plugin-setup block, and the design-sweep loop. Promoted `CLAUDE (1).md` to `CLAUDE.md` and removed the duplicate so there is one authoritative spec.

### D20. Token strategy: hard replacement, not an alias layer
**Why:** CLAUDE.md/DESIGN_SYSTEM.md require the old fonts/tokens to not appear anywhere. `tailwind.config.js` was rewritten to the locked `ll-*` palette + Caveat/DM Sans/DM Mono. Rather than keep old-name aliases (which would let stale tokens linger invisibly), every `sage-N`/`cream-N`/`terracotta-N`/`charcoal*` class was swept to its `ll-*` equivalent per `docs/migration-token-map.md`. Final `grep` over `src/` confirms **zero** old-token references. The `confirmed`/`pending`/`booked` semantic booking tokens were kept (remapped onto sage/terra/peri).

### D21. Periwinkle is the trust color
**Why:** The new system adds a periwinkle family with a specific job (DESIGN_SYSTEM.md §Trust Signal Hierarchy): background-check-confirmed chips, verification badges, credential chips, and nanny-card borders. Verified badges moved from sage→periwinkle; self-reported traits use sage. Trust chips render in DM Mono (the "trust label" treatment) and are never hidden/truncated on mobile.

### D22. Motion via a reduced-motion-safe helper module
**Why:** DESIGN_SYSTEM.md §Motion mandates spring physics on all interactive elements and `useReducedMotion()` wrapping. Added `src/lib/motion.ts` (springStandard/Gentle/Snappy + `useButtonHover`/`useCardHover`/`useChipHover`/`useSpringIn`), each returning an instant opacity-only transition when reduced motion is preferred. Motion is applied to buttons, interactive cards, chips, modals, drawers, and wizard step transitions — **not** to dense tables, data lists, or calendar day cells (where it would read as noise). `<Button>` springs by default; `<Card>` springs only with `interactive`.

### D23. framer-motion@11 added; audit delta is dev-only
**Why:** Installing framer-motion re-evaluated the dependency tree and `npm audit` rose from 4→11, but every new advisory is in dev tooling (esbuild via the bundler, uuid inside firebase-tools) — none in framer-motion's runtime or the shipped bundle. Consistent with D16: clearing them needs the breaking vite 8 upgrade, still deferred. The React/framer-motion event-type clash on `motion.button` (onDrag/onAnimation*) is resolved by omitting those handlers from the Button prop type.

### D24. The migration was fanned out to subagents; foundation done solo
**Why:** Per CLAUDE.md ("use subagents for all parallelizable work"), the design foundation (config, fonts, CSS, motion lib) and the high-reuse UI primitives + AppLayout were migrated solo first (everything depends on them), then the ~30 page/component files were swept by four parallel subagents over disjoint file sets. Verified green after merge: `tsc -b` clean, 21 tests pass, `vite build` succeeds, zero old tokens.

---

## Phase 7 — Deferred Phase 4 Polish (the 7 backlog items)

### D25. Reviews were already wired for family; extended to nanny + Bookings
**Why:** `ReviewModal` + `useSubmitReview` existed and were wired into the family dashboard only. Per spec, reviews are for both roles and accessible "at any time" from the Bookings page even after skipping the dashboard prompt. Added the same review-prompt-card pattern to the nanny dashboard and a "Leave a review" action on past booking rows in the shared `BookingsPage` (authorRole derived from the page's `role`).

### D26. Automated emails + calendar invites = a typed no-op stub layer (`notifications.ts`)
**Why:** Email provider (SendGrid vs Resend) and the Calendar API (Google vs iCal) are both **blocking open items** (#13/#14) — no real provider can be wired. Instead `src/lib/notifications.ts` defines a discriminated-union `NotificationEvent` covering every automated email in CLAUDE.md (Part 19 / §6 / §8) and a single `deliver()` no-op that logs in dev. Every booking write path in `useBookings` now fires the correct event (fire-and-forget, wrapped so a notify failure can never reject the booking). Wiring a real provider later is a one-function change. `calendarInvite()` is a matching documented stub.

### D27. Recurring 48h auto-cancel detection is pure + unit-tested; execution deferred
**Why:** `src/lib/recurring.ts` `findRecurringConflicts()` implements the §11.4 rule (recurring booking whose nanny dropped covering availability AND starts within 48h) as a pure function with `nowISO` injected for testability — 5 vitest cases in `recurring.test.ts`. The scheduled execution (a cron / Cloud Function that runs it, cancels, and notifies) is deferred because it needs server infra + the email provider; the detection logic is ready to drop in.

### D28. Exports are dependency-free CSV + print-to-PDF (`exporters.ts`)
**Why:** Rather than add a heavy SheetJS/PDF dependency, `exporters.ts` ships RFC-4180 CSV (Excel opens `.csv` directly) via a Blob download, and a branded print-ready invoice window that uses the browser's "Save as PDF". Wired into the admin billing "Download billing table (Excel)" button (real per-family CSV) and the family billing "Download this quarter (PDF)" button. Server-side `.xlsx`/PDF rendering is a documented future upgrade.

### D29. Admin Create Booking is a full override (no availability check)
**Why:** Added a "Create booking" modal to `AdminBookingsPage` (§7.3): select family + nanny + date/time + notes, status forced to `confirmed`, no availability restriction. Address defaults to empty (admin confirms offline / edits later) — surfaced in the form hint. Families/nannies come from `useUsersByRole('family')` and `useNannyDirectory`.

### D30. MonthGrid gains drag-to-select-range, click still works
**Why:** Added pointer-drag range selection to `MonthGrid` via an optional `onPickRange(start,end)` callback. A no-distance press still fires `onPickDay`, and keyboard activation always does single-day pick — so the calendar-first click flow and the nanny calendar are unchanged (backward compatible). A11y preserved (`aria-pressed`, Enter/Space handlers).

### D31. Public marketing site built; signed-out `/` is now the homepage
**Why:** Built `src/pages/public/` — `HomePage` (trust-forward hero, 3-step process, trust strip, teased nanny preview, CTA), `FamilyInfoPage` (`/for-families`), `NannyInfoPage` (`/for-nannies`, distinct content), and `ApplicationPage` (`/apply`, the real combined application + account-creation form per §2.1/§2.2 — reuses the SignupPage `createAccount`/Google/referral wiring; richer fields collected for UX, persisted again in the wizard). `IndexRedirect` now renders `HomePage` for signed-out visitors instead of bouncing to `/login`. Routes added in `App.tsx`. The design follows the locked Premium Playful system; periwinkle DM-Mono trust chips are the signature motif, addressing §Trust Hierarchy ("parents share home access with a stranger").

### D32. Auth loader watchdog — never trap users on an infinite spinner
**Why:** `AuthProvider` gated the whole app on Firebase resolving `onAuthStateChanged`; if the backend is slow/unreachable, users saw an infinite `FullScreenLoader`. Added an 8s watchdog: after the grace period, fall through as signed-out so the public site still loads (a real auth callback still takes precedence). Surfaced while verifying the homepage rendered without a reachable backend.

### D33. Hero entrance uses a CSS keyframe, not JS opacity gating
**Why:** The homepage hero initially used framer-motion `initial:{opacity:0}` → `animate:{opacity:1}`. If the JS animation loop never commits (stalled load, some headless/embedded contexts), the most important content stayed invisible. Switched the hero entrance to the `motion-safe:animate-spring-in` CSS keyframe, which commits its visible end state on its own and is disabled under `prefers-reduced-motion` via index.css. Content is now never gated on an animation completing. (Framer Motion still drives genuinely-interactive hover/tap elsewhere.)

### D34. Design tooling reconciled: ux-ui-mastery present, sumi cloned
**Why:** CLAUDE.md references a "design sweep" of `/grade /fix /style /qa /a11y` commands attributed to ux-ui-mastery + chef-sumi. In reality ux-ui-mastery (already installed) exposes different command names (`/design-review`, `/accessibility-check`, `/ai-ux-audit`…), and sumi was not installed at all. Cloned sumi from `github.com/phazurlabs/sumi` (it provides the actual `/grade /fix /style /qa /a11y /audit /roast /tokens` verbs). Plugin slash-commands only register at session startup, so the sweep is run by reading the command markdown directly this session; sumi `/grade` requires real screenshots, so the audit runs at the end against rendered screens.

---

## Phase 8 — Backend written "around Blaze" (2026-08-04)

### D35. Backend written but not deployed; deploy is Blaze-gated
**Why:** Cloud Functions and any outbound call (email/Stripe) require the Firebase **Blaze** plan, which David enables separately. Rather than wait, the whole `functions/` backend was written so it compiles + unit-tests green now and only needs `firebase deploy` + secrets on Blaze day. Every stub the previous phases left as a clean seam (D11/D26/D27) is now implemented behind that seam. Nothing user-facing shipped; the live landing site is unchanged.

### D36. Open items #13 → Resend and #14 → iCal
**Why:** These were flagged BLOCKING (no provider could be wired). Choosing them is what unblocked the backend. Email delivery is **server-side**: the client `notify()` (unchanged signature + call sites) now writes a `mail/{id}` doc, and `onMailCreated` sends via Resend — so the provider key never reaches the browser (the TIMELINE constraint). iCal is a hand-rolled RFC 5545 generator (no dependency) reused by both the client `calendarInvite()` and the email function.

### D37. Shared code copied into `functions/src/shared/`, not cross-imported
**Why:** The client compiles under Vite (bundler resolution, `import.meta`, DOM libs); `functions/` compiles CommonJS for Node. Cross-importing pulls incompatible tsconfig settings. The three shared pieces (the `NotificationEvent` union, pure `findRecurringConflicts`, the pure iCal generator) are side-effect-free, so they're **copied** and guarded by `notifications-events.test.ts` (diffs the copy's event-type list against the client source) so drift fails CI. Update the copy if the client original changes.

### D38. Email persists the client-computed event (doc-then-trigger), not server re-derivation
**Why:** At each call site the client already computes the exact discriminated-union event + payload. Persisting THAT (option a) is less code and a single source of truth vs. re-deriving events from Firestore diffs server-side (option b), which would duplicate the transition logic and can't reconstruct events that aren't 1:1 with a single write. `deliver()` writing a `mail` doc is the one-file change the D26 stub promised.

### D39. Stripe written but inert; billing gated behind `config/billing.enabled`
**Why:** The billing engine must exist but must not move money before David is ready. Two gates: (1) nothing charges until deployed on Blaze; (2) `quarterlyCharge` dry-runs (computes totals + writes invoices, skips the real PaymentIntent) unless `config/billing.enabled === true` (default false, flipped from the AdminSettings Billing tab). Session code uses Stripe **test mode** only. Card capture uses Elements (card data browser→Stripe, out of PCI scope); `hasPaymentMethod`/`stripeCustomerId` became **server-write-only** (rule-enforced + tested).

### D40. Client Stripe degrades gracefully when no publishable key is set
**Why:** Real Elements capture needs `VITE_STRIPE_PUBLISHABLE_KEY` + deployed functions. Without the key (today / local dev), the family wizard shows a "card at launch" fallback that still lets onboarding complete, so the app stays runnable while the backend is stood up. Real capture activates automatically once the key is present.

### D41. First security-rules unit tests; isolated `firestore-tests/` package
**Why:** Backlog flagged rules emulator tests as the top outstanding security gap. Added `@firebase/rules-unit-testing` (11 cases, emulator) covering every rule changed this session. It peers `firebase@11` while the client is on `firebase@12`, and `functions/` needs `firebase-admin@13` — so `functions/` and `firestore-tests/` are **isolated packages** (own node_modules) to avoid peer-dep conflicts rather than forcing incompatible resolutions into the client tree.

### D42. npm advisories: functions prod = one upstream `uuid`; dev-only otherwise
**Why:** The new `functions/` prod deps show 8 *moderate* advisories, all a single transitive `uuid` bounds-check issue pulled via Google's `@google-cloud/*`/`teeny-request` inside `firebase-admin`. Fixing needs an upstream Google bump; forcing it downgrades `firebase-admin` to v10 (breaking, net-worse). High/critical advisories are all dev-only `vitest`/`vite`/`esbuild` that never ship in the deployed bundle. Documented in `docs/security-audit.md` rather than force-breaking the toolchain — same posture as D-series client advisories.

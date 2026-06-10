# Backlog.md — Resume Point

> **How to resume (per CLAUDE.md › Context Management):**
> 1. Read `CLAUDE.md` (spec + flows), `DECISIONS.md` (decisions so far), and this file.
> 2. Run `git log --oneline` to confirm what's committed.
> 3. Run `npm install` if `node_modules` is missing, then `npx tsc -b && npx vitest run` to confirm a green baseline.
> 4. Continue from **"NEXT UP"** below.

---

## STATUS SNAPSHOT (as of last commit)

- **Phase 1 — Foundation: ✅ COMPLETE & COMMITTED** (`feat: foundation — scaffold, firebase, design system`)
- **Phase 2 — Auth: ✅ COMPLETE & COMMITTED** (`feat: auth — email, google, role routing, pending state`). Login + Signup pages, Google sign-in, role toggle, AuthProvider, guard chain, index/holding redirects, real router, 15 tests green, security re-check logged in DECISIONS.md.
- **Phase 3 — Onboarding: ✅ COMPLETE & COMMITTED** (`feat: onboarding — family wizard, nanny wizard, firestore schema`). Full `firestore.rules` + `storage.rules` for every collection, `useProfile`/`storage`/`badges` libs, `WizardShell`/`AvailabilityEditor`, family 3-step wizard, nanny 4-step wizard, both holding pages, wired into router. Built solo (not via subagents) due to context budget — noted in DECISIONS D12. 15 tests green.
- **Phase 4 — Core App: 👉 NEXT — START HERE**
- **Phase 5 — Security Audit: ⬜ NOT STARTED**

Baseline is green: `tsc -b` clean, 8 sanitize tests pass, `vite build` succeeds (as of Phase 1 commit). The Phase 2 files added since are listed below; **they have not yet been typechecked together** — verify before committing Phase 2.

---

## WHAT EXISTS RIGHT NOW

### Committed (Phase 1)
- Vite + React 18 + TS scaffold (hand-authored — see DECISIONS D1). Scripts: `dev`, `build`, `test`, `typecheck`.
- Tailwind design system: `tailwind.config.js` (sage/cream/terracotta/charcoal scales, `display`=Fraunces, `sans`=Nunito, booking-state tokens, shadows). Fonts loaded in `index.html`.
- `src/index.css` — base layer, focus-visible ring, reduced-motion, `.eyebrow`.
- `src/lib/firebase.ts` — env-only config, throws on missing var, emulator wiring.
- `.env.example` + gitignored `.env` (emulator-safe placeholders). `*.tsbuildinfo` gitignored.
- `firestore.rules` + `storage.rules` — **deny-all skeleton** with helpers `isAdmin()`, `hasRole()`, `isApproved()`, `userDoc()`. **MUST be expanded per-collection in Phase 3.**
- `firebase.json` — hosting security headers (HSTS, nosniff, frame-deny, referrer, permissions-policy), emulator ports.
- `src/types/index.ts` — ALL domain types: `UserDoc`, `Role`, `NannyStage`, `FamilyProfile`, `NannyProfile`, `Child`, `Badge`, `AvailabilityBlock`, `Booking`, `BookingStatus`, `Message`, `Conversation`, `Invoice`, `Review`, `Referral`.
- `src/lib/sanitize.ts` (+ test) — `cleanText`, `cleanLine`, `isValidEmail`, `normalizeEmail`, `cleanPhone`, `passwordError`, `friendlyAuthError`.
- `src/lib/cn.ts` — classname combiner.
- `src/components/ui/` — `Button`, `Card`+`CardLabel`, `Input`+`Textarea`+`Select`, `Badge`+`StatusPill`, `Logo`+`LambMark`, `Avatar`, `Modal`. Barrel at `index.ts`.
- Folder structure created: `components/{ui,layout}`, `hooks`, `pages/{auth,family,nanny,admin,public,onboarding}`, `context`, `lib`, `types`, `test`.
- `src/App.tsx` — **Phase 1 placeholder** (must be replaced with real router in Phase 2).

### Uncommitted (Phase 2, partial — already written to disk)
- `src/lib/referral.ts` — `generateReferralCode(uid)`, `referralUrl(code)`.
- `src/lib/auth.ts` — `fetchUserDoc`, `createAccount` (email/pw, writes users/{uid} with approved=false/status=pending), `signInWithEmail`, `signInWithGoogle` (provisions doc on first Google login, keeps stored role for returning users), `signOut`.
- `src/context/AuthContext.tsx` — `AuthProvider` + `useAuth()`. Listens to `onAuthStateChanged` + live `onSnapshot` of users/{uid} (role/approval reflect without re-login). `loading` until both resolve.
- `src/lib/routing.ts` — `homeRouteFor(profile)`: admin→/admin; !approved→/{role}/pending; approved&!wizardComplete→/{role}/setup; else→/{role}.
- `src/components/RouteGuards.tsx` — `RequireAuth`, `RequireRole({roles})`, `RequireApprovedAndOnboarded`, `FullScreenLoader`. RBAC decided from server-trusted profile.
- `src/hooks/useReferralCapture.ts` — captures `?ref=` into sessionStorage; `clearCapturedReferral()`.

---

## NEXT UP — finish Phase 2 (Auth)

Build these, then verify + commit:

1. **`src/pages/auth/LoginPage.tsx`** — email/password + Google sign-in. Role toggle ("I am a Family / I am a Nanny") per the spec's login screen. On success, redirect via `homeRouteFor(profile)` (read from `useAuth` after sign-in, or navigate to `/` and let an index redirect resolve). Use `friendlyAuthError`. Warm Editorial styling, mobile-first, WCAG AA, visible focus.
2. **`src/pages/auth/SignupPage.tsx`** — minimal account-creation entry OR fold account creation into the Phase 3 application forms (the flow docs say the *application form* creates the account). **Decision needed & to document:** simplest path = the public application forms (Phase 3) call `createAccount`; the `/signup` route can redirect to the family application. For Phase 2, a thin signup with role select + Google is enough to prove the flow; full field collection happens in Phase 3 forms. Capture referral via `useReferralCapture`, pass to `createAccount`/`signInWithGoogle`, then `clearCapturedReferral()`.
3. **Replace `src/App.tsx`** with the real `<Routes>`:
   - Public: `/login`, `/signup` (+ Phase 3 will add `/`, `/for-families`, `/for-nannies`, application forms).
   - Index `/` → redirect to `homeRouteFor(profile)` (or public homepage in Phase 3).
   - Guarded groups using `RequireAuth` → `RequireRole` → `RequireApprovedAndOnboarded`.
   - Wrap the tree in `<AuthProvider>` (currently `main.tsx` renders `<App/>` inside `<BrowserRouter>` — add provider in `App.tsx` or `main.tsx`).
   - Add placeholder route elements for `/admin`, `/family`, `/nanny`, `/family/pending`, `/nanny/pending`, `/family/setup`, `/nanny/setup` so guards resolve (real screens come in Phase 3/4).
4. **Auth security re-check (checklist §1–3)** — confirm: every guarded route requires auth; role/approval read server-side only; generic errors; no secrets client-side; password policy enforced on signup. Document findings in DECISIONS.md.
5. **Tests:** add a `routing.test.ts` for `homeRouteFor` (admin/pending/wizard/dashboard cases) — pure function, easy win. Optionally a guard smoke test.
6. **Verify:** `npx tsc -b && npx vitest run && npx vite build`. Fix until green.
7. **Commit:** `feat: auth — email, google, role routing, pending state`

---

## Phase 3 — Onboarding (parallelizable: 3 workstreams)

- **A — Family:** public application form (fields from CLAUDE.md §2.1: full name, email, password, phone, neighborhood, #children+ages, special notes, "how did you find us" suppressed if referral). Calls `createAccount({role:'family'})`. Holding page `/family/pending` (under-review msg + optional early-wizard prompt). 3-step wizard (`/family/setup`): Step1 Family Profile, Step2 Contact, Step3 Payment Card (required — stub Stripe/card UI, store `hasPaymentMethod`). Wizard blocks dashboard until `wizardComplete=true`. Save progress to `families/{uid}` on each step (resume on reload).
- **B — Nanny:** application form (§2.2: name, email, password, phone, years experience, personal statement, referral). Holding page `/nanny/pending` with 4-stage progress bar (application_received → under_review → interview_scheduled → decision_made), Calendly link shown at interview_scheduled. 4-step wizard (`/nanny/setup`): Step1 Photo+Bio(≤500), Step2 Intro Video(≤1min, required, Storage upload), Step3 Badges (self-reported select; verified shown read-only, color-coded), Step4 Weekly Availability (recurring hours/day → `AvailabilityBlock[]`). Save to `nannies/{uid}` per step.
- **C — Firestore schema + rules:** expand `firestore.rules` for EVERY collection (users, families, nannies, bookings, messages, conversations, invoices, reviews, referrals). Rules: families read/write own family doc; nannies read/write own nanny doc; nanny public profile readable by approved users; families read only their own bookings, nannies read only bookings where `nannyId==uid` (+ open/unmatched); admin read/write everything; messages gated by participant membership; reviews admin-read-only; **never trust client role/approved** — only admin can flip `approved`. Add matching `storage.rules` for `profile-photos/{uid}`, `intro-videos/{uid}` (size + content-type limits). Add needed composite indexes to `firestore.indexes.json`.
- **Commit:** `feat: onboarding — family wizard, nanny wizard, firestore schema`

---

## Phase 4 — Core App (one subagent per feature where parallelizable)

Build every flow in CLAUDE.md. Checklist:

**Layout/nav:** Family sidebar, Nanny sidebar (no Billing), Admin sidebar (no My Profile). Persistent layout wrapper per role (`components/layout/`).

**Dashboards:** Family (next booking, bookings-this-quarter, review-prompt cards, messages preview, "Book a Nanny" CTA). Nanny (next booking, pending-requests count, open-bookings card, availability glance, review prompts, messages preview). Admin (priority stack: same-day booking BANNER → unmatched bookings → nanny cancellation requests → pending nanny apps → pending family apps → failed payments).

**Calendars:** Family (month/week/day/list, green=confirmed/amber=pending, click→detail modal, drag→booking flow). Nanny (same toggles, 3 slot states empty/available/booked, drag-add availability, click-remove, booked locked).

**Bookings pages:** Family (list, cards, view/cancel). Nanny (list, accept/decline pending, leave review, history). Admin (platform-wide, filters status/date/family/nanny, cancel/reassign/edit, Create Booking form with full override).

**Our Nannies:** Browse (cards: photo, badges, bio excerpt, availability indicator, view/book). Full profile (photo, bio, intro video, color-coded badges, availability grid, families-worked-with, book + request-outside-hours). Nanny view = same but booking buttons hidden.

**My Profile:** Family (all editable fields §10.1). Nanny (editable + verified badges read-only + completeness indicator + families-worked-with).

**Messages:** Family (family↔admin, family↔nanny; list+thread; new message). Nanny (nanny↔admin anytime; nanny↔family only if completed booking exists). Admin (unified inbox, All/Families/Nannies filter, new message, internal Lucy/David reply tagging shown only to admin — families/nannies see "Admin Team", statuses unread/read/replied/mark-unread).

**Billing:** Family (bookings-this-quarter, invoice history, PDF download, billing model $25/qtr + $1/booking). Admin Billing & Accounting (4 tabs: Overview, Current Billing, Invoice History, Accounting w/ 10%-of-revenue donation tracker + "Mark as Donated" + Excel export).

**Analytics (admin):** 5 tabs Overview/Platform Health/Revenue/Bookings/Growth — all metrics in CLAUDE.md Part 14.

**Policies pages** (family + nanny). **Settings** (all 3 roles; admin: email templates, badge management, platform policies editor, billing config, Calendly field).

**Booking flows end-to-end:** calendar-first; nanny-first path A & B; open bookings; recurring + 48h auto-cancel; same-day → admin routing; family cancellation; nanny cancellation via message to admin.

**Referral system:** unique link per account (have `referralCode`/`referralUrl`), auto-tag on signup (have `useReferralCapture`), attribution stored. **Reviews:** post-booking prompt card, skip logic, accessible from bookings page, admin-only visibility.

- **Commit:** `feat: core app — all screens, flows, and features complete`

---

## Phase 5 — Security Audit

Work all 17 checklist sections in `docs/security-checklist.md`. Specific TODOs already identified:
- **§6/§7 Firestore rules** — final airtight pass; verify every collection denies cross-tenant reads/writes; test with emulator if possible.
- **§9** — tighten CSP in `firebase.json` once all external origins known (Firebase, Google fonts, Calendly, any payments).
- **§13 Dependency Management** — `npm audit` showed 14 vulns (12 moderate/1 high/1 critical) at install; run `npm audit fix`, re-evaluate, document any left.
- **§14 Rate limiting / anti-abuse** — wire Firebase App Check (reCAPTCHA v3; `VITE_FIREBASE_APPCHECK_SITE_KEY` placeholder already in env) for auth/abuse protection.
- **Firestore/Storage rules emulator tests** — `firebase` CLI was NOT installed during the build (DECISIONS D12). Install `firebase-tools`, add `@firebase/rules-unit-testing`, and write rule unit tests covering the access matrix (cross-tenant denial, self-approve denial, verifiedBadges immutability, reviews admin-only, message participant gating). This is the most important outstanding security verification.
- Confirm no secrets in source (`.env` gitignored ✓). Generic errors everywhere. Run tests recursively until green.
- **Commit:** `security: full audit complete, all issues resolved`

---

## OPEN DECISIONS TO DOCUMENT (in DECISIONS.md as made)
- Signup vs application-form account creation split (see Phase 2 item 2). Lean: application forms create accounts; `/signup` redirects to family application.
- Payment card step: stub vs real Stripe. Lean: stub UI storing `hasPaymentMethod` flag (no real PCI scope in this build) — document clearly.
- Intro video storage approach (direct-to-Storage upload with rules-enforced size cap).
- Calendly: env-config field only (no live integration) — it's a BLOCKING open item in the flow docs.
- Email provider (SendGrid/Resend) and Calendar API are BLOCKING open items — build UI/triggers as no-op stubs documented as pending.

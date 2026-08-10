# Security Audit — Little Lamb Nannies

Phase 5 audit against `docs/security-checklist.md` (all 17 sections). Date: 2026-06-10.
Status legend: ✅ done · ⚠️ done with a noted follow-up · ⏭️ deferred (gated on an open item).

---

## 1. Authentication ✅
- Firebase Auth (trusted, maintained) handles email/password + Google. No hand-rolled auth.
- Password policy enforced at signup (`passwordError`: ≥8 chars, letter + number, ≤128).
- Session + reset handled by Firebase. Every backend request is authenticated by the SDK and
  authorized by security rules.
- ⚠️ In-app MFA not yet surfaced (Firebase supports it). Follow-up before launch.

## 2. Middleware Protection ✅
- SPA guard chain `RequireAuth → RequireRole → RequireApprovedAndOnboarded` gates every private
  route. **The real enforcement boundary is Firestore/Storage rules**, not the client guards —
  documented so client checks are never mistaken for the security boundary.

## 3. Role-Based Access Control ✅
- Role + `approved` read from the server-trusted `users/{uid}` doc; never from a client claim.
- Rules resolve admin via `get()` on the user doc (not a forgeable client value).
- **Audit fix:** `bookings` now uses a per-document `read` rule so Firestore only accepts list
  queries scoped to the caller's own data (a family can't list other families' bookings). See §7.

## 4. Sensitive Data Handling ✅
- Firebase web config is `.env`-sourced and public-by-design (a project identifier, not a secret).
- `.env` is gitignored and confirmed untracked. Secrets scan of `src/` is clean.
- No server-only secrets exist in the client (no payment processor keys, etc.).
- **Audit fix:** `users/{uid}` (holds phone, email, referral data) is non-listable by members.
  The nanny directory was refactored to denormalize `fullName` into the public `nannies/{uid}`
  doc, so browsing never reads the private users collection.

## 5. Error Handling ✅
- `friendlyAuthError` maps every Firebase auth code to a generic user message — no system,
  database, or stack detail leaks to the UI. Failed Firestore reads degrade to empty state.

## 6. Input Validation ✅
- `src/lib/sanitize.ts` strips control chars, bounds length, normalizes email/phone on every
  write path (wizards, profiles, bookings, messages, reviews).
- Rules enforce matching length caps server-side (`strMax`) — defense in depth.
- XSS: React escapes by default; no `dangerouslySetInnerHTML` anywhere in the app.

## 7. Database Security ✅
- Firestore rules: default-deny, explicit per-collection grants, no open reads/writes.
- Cross-tenant isolation verified by review: families read only their own family doc + bookings;
  nannies read only their assigned/open bookings; reviews are admin-read-only; messages require
  conversation participant membership; only admin flips `approved`/`status`/`role`; nannies can't
  self-assign `verifiedBadges` (immutable from client on create and update).
- Storage rules: owner-only writes, image/video content-type + size caps, deny by default.
- ⚠️ Emulator-based rules unit tests are queued (Firebase CLI unavailable in the build env).
  Rules were reviewed line-by-line against the access matrix. This is the top launch follow-up.

## 8. Hosting ✅
- Firebase Hosting (managed, auto-patched, DDoS-protected CDN). SPA rewrite to index.html.

## 9. Secure Communications ✅
- HTTPS enforced by Firebase Hosting. Security headers set in `firebase.json`: HSTS (preload),
  X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, and a
  **Content-Security-Policy** scoped to the exact origins used (Firebase, Google Fonts,
  reCAPTCHA, Calendly), with `object-src 'none'` and `frame-ancestors 'none'`.

## 10. Logging and Monitoring ⚠️
- Firebase provides auth + Firestore audit logging and usage dashboards. App-level alerting
  (e.g. failed-payment / abuse alerts) to be configured in the console pre-launch.

## 11. Security Testing and Audits ⚠️
- This document + line-by-line rules review + dependency scan.
- Rules emulator unit tests are **done** (`firestore-tests/`, 19 cases) — this section
  previously said they were "scheduled before launch", which line 114 below already superseded.
- Penetration testing still outstanding before launch.

## 12. Backup and Disaster Recovery ⏭️
- Enable scheduled Firestore exports (PITR / daily export to GCS) in the project. Configuration
  task, not code — documented for the launch checklist.

## 13. Dependency Management ✅
- `npm audit` reduced from **14 → 4** by upgrading firebase 10 → 12 (pulled the vulnerable
  bundled `undici` forward) and pinning vite/vitest. The remaining 4 are **dev-tooling only**
  (esbuild dev server, vite dev server, vitest UI) — none ship in the production bundle or run
  in a user's browser. Fully clearing them needs vite 8 (breaking); deferred, tracked in Backlog.

## 14. Rate Limiting and Anti-Abuse ⚠️
**Previously marked ✅ — that was an overstatement. Corrected 2026-08-10.** App Check is code-wired
but has never actually been in effect, in two independent ways:
- **No site key anywhere.** `VITE_FIREBASE_APPCHECK_SITE_KEY` is **empty** in `.env`,
  `.env.staging`, and `.env.production`, so the `if (appCheckSiteKey)` guard in
  `src/lib/firebase.ts` / `src/landing/firebase.ts` never fires and `initializeAppCheck` has
  never run in any deployed build. No request has ever carried an attestation token.
- **No backend enforcement.** Before this session there was **zero** `enforceAppCheck` in
  `functions/src/` and **zero** `request.app` in `firestore.rules` — so even with a key pasted
  in, nothing would have rejected a token-less request. The earlier claim that backends "accept
  them" only after attestation was wrong.

Fixed this session (partially): `enforceAppCheck: true` added to both callables
(`createSetupIntent`, `savePaymentMethod`) so the key becomes a real switch. `request.app` is
**deliberately not** required in `firestore.rules` — a misconfigured key must never be able to
take the public `waitlist` form (the pre-launch site's only conversion path) offline. Turning the
key on is a console task: see **`docs/app-check-runbook.md`**.

**The section title also overstates.** There is no rate limiting on the platform's own write
paths. Firebase Auth's brute-force throttle (`auth/too-many-requests`, surfaced generically) is
real but applies only to *login*; it does nothing for the `mail` and `waitlist` create paths,
which are the actual abusable surfaces (public/signed-in create, email-triggering). Server-side
quota work on the `mail` path is landing separately this session — that, not App Check, is the
real abuse control on the outbound-email path.

## 15. Data Privacy Compliance ⚠️
- Data minimization: only fields the product needs are collected. Account deactivation requests
  exist in Settings. A public privacy policy + consent copy is a content task for launch.

## 16. Incident Response & Security Awareness ⏭️
- Two-admin team (Lucy & David). A short incident-response runbook (revoke sessions, disable
  account, rotate keys, restore from export) to be written for the launch checklist.

## 17. Infrastructure as Code Security ✅
- Infra-as-code surface = `firebase.json`, `firestore.rules`, `storage.rules`,
  `firestore.indexes.json`, all version-controlled and reviewed. Rules follow least privilege.

---

## Audit fixes applied this phase
1. **Booking list authorization** — replaced a blanket member `list` grant with a per-document
   `read` rule so non-admins can only list their own bookings (cross-tenant read closed).
2. **Private user data** — kept `users/{uid}` non-listable; denormalized nanny `fullName` to the
   public profile doc so the directory never reads private user records.
3. **Verified-badge immutability** — nannies cannot seed or change `verifiedBadges` on create or
   update; admin-only.
4. **Dependencies** — firebase 10 → 12; remaining advisories are dev-only.
5. **CSP** — added a tight Content-Security-Policy to hosting headers.
6. **App Check** — wired reCAPTCHA v3 attestation **in client code only**. Not in effect: no
   site key is configured in any env, so it never initializes, and at the time this line was
   written nothing enforced it server-side either. See the corrected §14.

## Outstanding before launch (tracked in Backlog.md)
- ~~Rules emulator unit tests~~ ✅ **Done** — see the backend section below.
- Firestore scheduled backups / PITR.
- In-app MFA, privacy policy content, monitoring alerts, incident runbook.
- Clear dev-only `npm audit` advisories via vite 8 upgrade.

---

## Backend surface audit (Cloud Functions — 2026-08-04)

The `functions/` backend and its client seams were added this session (written, not yet
deployed — Blaze-gated). Security review of the new surface:

### New/changed authorization (verified by rules unit tests)
The repo's **first security-rules unit tests** now live in `firestore-tests/`
(`@firebase/rules-unit-testing`, run against the emulator, 11 cases green). They cover the
rules added/changed this session:
- **`mail`** — create-only for signed-in users, restricted to a **known `event.type`**,
  `status=='pending'`, server timestamp; admin-read-only (cannot be enumerated). Verified:
  unknown event type denied, non-pending status denied, unauthenticated create denied,
  non-admin read denied.
- **`families` billing fields** — `hasPaymentMethod` and `stripeCustomerId` are
  **server-write-only** (set only by the `savePaymentMethod` function). Verified: a family
  cannot self-set either field, but can still edit non-billing profile fields.
- **`invoices`** — family reads only its own; create/update admin-only. Verified.
- **`billing_alerts`** — admin-only read + write (server-written). Verified.
- **`storage.rules`** — `invoices/{familyId}/…` readable only by that family; no client writes.

### Function-level authz
- Callables (`createSetupIntent`, `savePaymentMethod`) reject unauthenticated callers
  (`request.auth` check → `HttpsError('unauthenticated')`) and scope every write to the
  caller's own `uid`.
- The **Stripe webhook** verifies the `stripe-signature` against `STRIPE_WEBHOOK_SECRET`
  before acting — unsigned/forged events are rejected with 400.
- All provider keys (Resend, Stripe secret + webhook) are **`defineSecret` secrets**, bound
  per-function, never in client env or source. Publishable Stripe key is client-public by design.
- Email sending is server-side only; the client just enqueues a `mail` doc, so no provider
  key ever reaches the browser.

### Billing safety
- The quarterly charge is **inert by default**: it only charges when deployed AND
  `config/billing.enabled === true` (default false → dry-run computes totals + writes
  invoices but never moves money). Session code targets Stripe **test mode** only.

### npm advisories (new `functions/` package)
- **Production deps** (`firebase-functions`, `firebase-admin`, `resend`, `stripe`, `pdfkit`):
  8 *moderate* advisories, all a single transitive `uuid` bounds-check issue pulled in via
  Google's own `@google-cloud/*`/`teeny-request` chain inside `firebase-admin`. Fixing
  requires an upstream Google bump; forcing it would downgrade `firebase-admin` to v10
  (breaking, net-worse). **Wait-for-upstream**, not actionable locally.
- **Dev-only** (`vitest`/`vite`/`esbuild`): high/critical advisories exist but are test
  tooling that never ships in the deployed function bundle. Same class as the client's
  dev-only advisories; cleared by a future vitest/vite major bump.

### Still Blaze-gated (cannot verify until deploy)
Real card charges, live Resend delivery, live webhook round-trip, and the `onSchedule` crons
firing. Exercisable in the emulator against Stripe test + a Resend test key; production
behavior confirmed on Blaze day.

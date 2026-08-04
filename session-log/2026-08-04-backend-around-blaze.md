# 2026-08-04 — Backend written "around Blaze"

## Goal
David will enable the Firebase **Blaze** (pay-as-you-go) plan later. Blaze is the hard gate for
Cloud Functions and any outbound call (Resend email, Stripe). This session did **everything around
that gate**: write the entire Cloud Functions backend so it compiles + unit-tests green but is
**not deployed** — so Blaze day is a deploy + add-secrets step, not a build. Confirmed up front:
full functions code, **Resend** for email, **commit per section**.

---

## What was done (7 commits on `landing-page-prelaunch`)

1. **`feat(functions): scaffold Cloud Functions project`** — new self-contained TS package
   `functions/` (Node 20, firebase-functions v2, own package.json/tsconfig/eslint/vitest). Added the
   `functions` block + emulator port 5001 to `firebase.json`. `firebase.ts` (admin singletons),
   `config.ts` (defineSecret handles + billing constants), re-export-only `index.ts`, README with a
   Blaze-day checklist.
2. **`feat(functions): shared types + real iCal generation`** — resolved open item **#14 → iCal**.
   Copied the `NotificationEvent` union + pure `findRecurringConflicts` into `functions/src/shared/`
   (drift-guarded by a test that diffs against the client source). Authored pure `buildICalEvent`
   (RFC 5545, stable UID, escaping, line folding, 8 tests); copied to `src/lib/ical.ts`; rewrote the
   client `calendarInvite()` stub to emit a real `.ics`. Scoped the client Vitest to `src/` so the
   Node and jsdom suites stay separate.
3. **`feat(functions): Resend email pipeline via mail-doc trigger`** — resolved open item **#13 →
   Resend**, server-side. Client `notify()`'s `deliver()` now enqueues a `mail/{id}` doc (was a
   no-op); `onMailCreated` claims it transactionally (idempotent), resolves recipients server-side,
   renders (exhaustive `switch` over all 12 variants, iCal REQUEST/CANCEL), sends via Resend. Added
   the `mail` rule (create-only signed-in / known event.type / admin-read-only).
4. **`feat(functions): waitlist signup notification`** — `onWaitlistCreated` emails the team on new
   landing-site signups; retired the `>>> EMAIL HOOK <<<` marker in `src/landing/waitlist.ts`.
5. **`feat(functions): 48h recurring auto-cancel scheduled job`** — `recurringAutoCancel`
   (onSchedule hourly) runs the pure conflict rule, cancels + enqueues the auto-cancel email; write
   logic factored into `recurringCore.ts` and unit-tested with fakes (4 cases). Added the
   `recurring + date` composite index.
6. **`feat(functions): Stripe billing engine …`** + **`feat: real Stripe card capture + billing
   config …`** — setup-intent/save-PM (onCall), quarterly charge (pure math tested), pdfkit invoice
   → Storage, signature-verified webhook. Client: `FamilySetupWizard` step 3 → real Stripe Elements
   (`PaymentStep`), with a **graceful fallback** when no publishable key is set so onboarding is
   never blocked pre-Blaze. AdminSettings Billing tab → live `config/billing` doc (rates + a "charge
   for real" master switch, default off). AdminBilling Overview → failed-payment cards from
   `billing_alerts`. Tightened rules (`hasPaymentMethod`/`stripeCustomerId` server-write-only;
   `billing_alerts` admin-only; family reads own invoice PDFs). CSP allows Stripe + cloudfunctions.
7. **`test: Firestore rules unit tests + backend security audit`** — the repo's **first** rules unit
   tests (`firestore-tests/`, isolated package to keep firebase@11 out of the client tree), 11 cases
   green against the emulator. Documented the backend attack surface + npm-advisory triage in
   `docs/security-audit.md`. Added `test:functions`/`test:rules`/`test:all` + `deploy:functions`
   scripts.

---

## Key decisions (and why)

- **Blaze recommended for email/Stripe = #13 → Resend, #14 → iCal.** Both were "blocking open
  items"; picking them now is what let the backend be written. Resend delivery is **server-side**
  (client only enqueues a `mail` doc) so the provider key never reaches the browser.
- **Shared code is copied into `functions/src/shared/`, not cross-imported.** The client compiles
  under Vite (bundler resolution, `import.meta`, DOM) and functions compile CommonJS/Node; a copy of
  the 3 pure pieces (union, recurring, iCal) avoids pulling incompatible module settings, guarded by
  a drift test. (If these change on the client, update the copy — the test will flag it.)
- **Email = write-a-doc-then-trigger** (persist the event the client already computed) rather than
  re-deriving events from Firestore diffs server-side. Less code, single source of truth.
- **Stripe written but inert.** Test-mode keys only; the quarterly charge is gated behind
  `config/billing.enabled` (default false → dry-run) so it can't move money until David flips it.
- **Graceful Stripe gate on the client.** No `VITE_STRIPE_PUBLISHABLE_KEY` → wizard shows a "card at
  launch" fallback; real Elements capture activates when the key is set + functions deploy. Keeps the
  app runnable now.
- **Isolated `functions/` and `firestore-tests/` packages** (own node_modules) to avoid peer-dep
  conflicts with the client's firebase@12 (functions needs firebase-admin@13; rules-unit-testing@4
  peers firebase@11).

---

## Current state

- **Green everywhere:** root build + **28** client tests; `functions` build + lint + **34** tests;
  **11** rules tests (emulator, needs Java — present locally). Landing build OK.
- **Nothing deployed** — the backend is written and waits on Blaze. Landing site still live on prod +
  staging as before; waitlist writes still work; no user-facing change shipped this session.
- All work committed on `landing-page-prelaunch` (7 commits, `44791db..70ce804`). `TIMELINE.md` was
  untracked at session start — committed here with the session-log.

---

## Next steps (handoff)

1. **Enable Blaze** on `littlelamb-sb` (+ staging). Then:
   - `npm run deploy:functions:staging` (then prod).
   - Set secrets: `firebase functions:secrets:set RESEND_API_KEY` / `STRIPE_SECRET_KEY` /
     `STRIPE_WEBHOOK_SECRET` (see `functions/README.md`).
   - Verify a real signup approval emails; a booking fires a confirmation + working `.ics`.
2. **Resend:** verify the sender domain for `hello@littlelambnannies.com`.
3. **Stripe:** create the account (test → live), set `VITE_STRIPE_PUBLISHABLE_KEY` in the env files,
   register the webhook endpoint (the deployed `stripeWebhook` URL). Flip `config/billing.enabled`
   only when ready to charge for real.
4. **Wire the remaining `notify()` call sites** that fire the already-defined-but-unused events:
   `application_status_updated/approved/rejected` in `useAdmin` approve/reject/advanceStage, and
   `new_message` in `useMessages` send. (Backend already handles them — just add the `notify(...)`.)
5. Deploy the new composite index (`firebase deploy --only firestore:indexes`) and updated rules.
6. Still open from before: custom domain (Wix access), App Check keys.

See `docs/security-audit.md` (backend section) for the security review and `functions/README.md`
for the Blaze-day runbook.

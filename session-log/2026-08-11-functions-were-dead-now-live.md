# 2026-08-11 (later) — The backend was never live; app deployed; David checklist shipped

## Context

Continued from the domain-live / talk-to-lucy handoffs. David reported **no more hold-ups on his
side** (DNS control + Lucy's content resolved). Goal: knock out ≥¼ of the ~2-week launch window,
stand up a safe test bed, and produce a standalone David checklist reusing the concierge agent.

The plan called for deploying the app to prod-unpromoted as the test bed. In the course of verifying
it, the session uncovered — and fixed — a **launch-blocking bug the last two handoffs missed.**

---

## THE BIG ONE — all 7 Cloud Functions were silently FAILED (now ACTIVE)

`functions:list` showed the 7 functions, and two handoffs recorded them as "deployed." **They were
in `state: FAILED`** — registered resources whose containers never started; the URLs 404'd. That
means the whole backend was dead: no email, no billing, no waitlist notification. A launch off that
state would have shipped a working-looking front end over a dead backend.

**Two stacked causes (full write-up: DECISIONS D65):**

1. **Stale HTTPS stubs** from an early partial deploy blocked every later deploy with
   `Changing from an HTTPS function to a background triggered function is not allowed`. Fix:
   `firebase functions:delete <all> --force`, then deploy fresh.
2. **The real container crash: `Cannot find module '@firebase/app'`** — read from
   `firebase functions:log`, NOT guessable from deploy output. `firebase-functions` v2 eagerly loads
   its RTDB provider → `firebase-admin/database` → `@firebase/database-compat` requires
   `@firebase/app`, which is declared nowhere in the `firebase-admin@13`/`firebase-functions@6` tree
   and is pruned from the container. It resolves on a dev machine, which is why it "worked" locally
   and no unit test caught it. **Fix: pin `@firebase/app ^0.11.5` in `functions/package.json`.**

**Verified live:** all 7 `state: ACTIVE`; `stripeWebhook` returns **400** (Missing/Invalid
signature) to an unsigned POST, `createSetupIntent` returns **401 UNAUTHENTICATED**, both schedulers
registered. ⚠️ **Do NOT remove `@firebase/app`** — looks unused, is load-bearing for the container.

The five code-level hypotheses in the prior handoff (module-scope `.value()`, pdfkit, Node 22-vs-20,
`lib/` not shipping, missing deps) were all wrong — they were guessed without reading the container
log. Lesson: `firebase functions:log` first.

---

## Also done this session

- **App deployed to prod (unpromoted).** Created the `littlelamb-sb-app` hosting site (it never
  existed) and deployed the real app bundle to `https://littlelamb-sb-app.web.app`. The apex domain
  **stays on the landing page** — the app is reachable for testing but not public. Verified: HTTP
  200, app bundle + app CSP (Stripe/Firebase/App Check allowed), SPA deep-links serve.
- **New npm scripts:** `build:app:{staging,prod}` + `deploy:app:{staging,prod}` (none existed;
  `deploy:landing:*` only shipped the landing).
- **`scripts/make-admin.mjs`** — promotes an existing Auth account to admin via the Admin SDK (no
  in-app admin path by design). Prod-only, refuses emulator env, never touches billing. Running it
  needs David's prod credential (no ADC/gcloud/service-account key on this machine).
- **David's launch checklist** — refreshed the stale `launch-concierge` agent facts, wrote
  `docs/david-launch-checklist.md`, and published it as an artifact
  (https://claude.ai/code/artifact/50f61149-8d9b-4c4e-8c75-0a1affc5a19d). Ordered: Resend DNS →
  Stripe webhook → first admin → App Check → live keys.
- **Housekeeping:** SUPERSEDED banners on the removed-messaging spec in `CLAUDE.md` (3 sections);
  new `AdminDashboard.test.tsx` (5 tests) covering the D61 "partial/failed read must not read as
  empty" bug class.

**Green:** client **75** / functions **44** / rules **23** = 142. Lint `--max-warnings 0` clean.
tsc clean. Everything committed on `landing-page-prelaunch`.

---

## Decisions

- **D65** — `@firebase/app` pinned so the container starts (see above). The load-bearing dep.
- **Test bed = prod-unpromoted, not staging** (confirmed with David). Decisive reason: staging's
  `.env.staging` has an empty `VITE_FIREBASE_APPCHECK_SITE_KEY`, so the two App-Check-enforced
  billing callables reject real calls there — you can't test card capture end-to-end on staging.
  Prod has a real key; prod-unpromoted exercises the real enforced path with billing safely in
  dry-run and the app off the public domain.

---

## Current state (what's live / green / broken)

- **LIVE:** apex `littlelambnannies.com` (landing, SSL). App at `littlelamb-sb-app.web.app`
  (unpromoted). All 7 functions ACTIVE + verified serving. Billing safely OFF (dry-run).
- **GREEN:** 142 tests, lint 0, tsc clean, both builds OK.
- **NOT DONE / BLOCKED:** Resend domain DNS not added (no email until then); `STRIPE_WEBHOOK_SECRET`
  still placeholder; first admin not provisioned (needs David's credential); App Check binding
  unverified (needs real traffic); live payment keys (needs Stripe business verification).

---

## Next steps (precise handoff)

1. **David works the checklist** (artifact above): Resend DNS → webhook `whsec_` → first admin.
   The webhook URL is `https://us-central1-littlelamb-sb.cloudfunctions.net/stripeWebhook`,
   verified serving (returns 400 to an unsigned POST).
2. **Provision the first admin** once David has a service-account key: `node scripts/make-admin.mjs
   <email> "<name>"` with `GOOGLE_APPLICATION_CREDENTIALS` set.
3. **E2E email test:** write a `mail/{id}` doc to prod → `onMailCreated` fires → until Resend DNS is
   verified it fails cleanly at the send step (visible in the admin Undelivered-email section). That
   failure IS the proof the pipeline works end-to-end up to the provider.
4. **Full three-role E2E on prod-unpromoted:** family signup → admin approval → nanny signup →
   booking → confirmation email + iCal → billing dry-run. Budget a full session; expect findings.
5. **App Check:** watch the Verified/Invalid split in the console over real traffic before enforcing.
6. **Go live:** Lucy's content in → point apex at the app → live payment keys → flip
   `config/billing.enabled` on. ⚠️ Until that flip, checkout looks live but charges nobody.

**Estimate:** engineering is essentially done; the gate is Stripe business verification + Lucy's
content — ~1–2 weeks.

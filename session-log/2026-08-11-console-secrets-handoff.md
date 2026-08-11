# Handoff — Console secrets provisioned (Stripe / Resend / App Check)

**Date:** 2026-08-11
**Author:** Launch-concierge session (David, driving the consoles)
**For:** The engineering/deploy Claude session
**TL;DR:** Three of the account/console launch-blockers are now provisioned. This is what
was set, exactly where it lives, and what the code needs from you to actually use it. No code
was changed except `.env.production` (two client-public keys added).

---

## What was provisioned this session

| Item | Where it lives | Value visibility | Status |
|------|----------------|------------------|--------|
| Stripe publishable key (`pk_test_…`) | `.env.production` → `VITE_STRIPE_PUBLISHABLE_KEY` | public, in file | ✅ set (TEST mode) |
| Stripe secret key (`sk_test_…`) | Google Secret Manager → `STRIPE_SECRET_KEY` | secret, never in repo | ✅ set + verified |
| Resend API key (`re_…`) | Google Secret Manager → `RESEND_API_KEY` | secret, never in repo | ✅ set + verified |
| App Check reCAPTCHA v3 site key (`6L…`) | `.env.production` → `VITE_FIREBASE_APPCHECK_SITE_KEY` | public, in file | ✅ set (see caveat) |

All are **TEST / pre-launch** values. Live swaps are noted below.

### Verified, not assumed
- `firebase functions:secrets:access STRIPE_SECRET_KEY --project littlelamb-sb` → returns a real `sk_test_…` value.
- `firebase functions:secrets:access RESEND_API_KEY --project littlelamb-sb` → returns a real `re_…` value.
  (First attempt captured a stray shell line; it was overwritten and re-verified clean.)
- `.env.production` edited directly — see the two new blocks with explanatory comments.

---

## Code touchpoints — how each key connects

### 1. Stripe publishable key → client
- Read by `src/hooks/useBilling.ts:11` as `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`.
- Drives the `stripeEnabled` gate (`useBilling.ts:14`). Now that the key is present, a
  **production build** flips `stripeEnabled` to `true` and the wizard uses the real
  card-capture path instead of the "payment activates at launch" fallback.
- **Nothing to change in code.** Just note that prod builds now expect the Cloud Functions
  (`createSetupIntent`, `savePaymentMethod`) to be deployed — otherwise the client will call
  callables that 404. See §Deploy below.

### 2. Stripe secret key → functions
- Bound via `functions/src/config.ts:8` `defineSecret('STRIPE_SECRET_KEY')`.
- Consumed by `functions/src/billing/stripe.ts:14`, `setupIntent.ts`, `quarterlyCharge.ts`,
  `webhook.ts` through their `secrets: [STRIPE_SECRET_KEY]` options.
- **Nothing to change.** The secret exists in Secret Manager; deploy binds it automatically.

### 3. Resend API key → functions
- Bound via `functions/src/config.ts:7` `defineSecret('RESEND_API_KEY')`.
- **Blocked on DNS for real sending:** `EMAIL_FROM` / `ADMIN_EMAIL` in `config.ts:15,18` are
  hardcoded to `hello@littlelambnannies.com`. Resend will reject that sender until the
  `littlelambnannies.com` domain is verified (SPF/DKIM records), which is pending the DNS
  decision (see §Still open).
- **For pipeline testing before DNS:** the mail send can be temporarily pointed at Resend's
  `onboarding@resend.dev` sender (no domain verification needed). That's a *test-only* code
  swap in `config.ts` — your call whether to wire a temporary/env-gated sender. Do **not**
  ship `onboarding@resend.dev` to real users.

### 4. App Check reCAPTCHA v3 site key → client
- Read by the client App Check init as `VITE_FIREBASE_APPCHECK_SITE_KEY` (reCAPTCHA v3 provider).
- The two billing callables already have `enforceAppCheck: true`:
  `functions/src/billing/setupIntent.ts:37,54`. So once the client ships with this key and
  attaches tokens, those callables are live-enforced immediately — this is what takes card
  capture from dead-on-arrival to working.

> ⚠️ **App Check caveat — verify at deploy.** David created the reCAPTCHA key in the Google
> Cloud reCAPTCHA console (the flow wandered near Enterprise/WAF options) **and** separately
> registered reCAPTCHA v3 in Firebase App Check. If the site key now in `.env.production` is
> *not* the one whose secret is linked to the Firebase App Check provider, tokens will be
> rejected. **At deploy, confirm on the App Check metrics page that valid tokens arrive.** If
> they show invalid: re-register this exact key under
> **Firebase → App Check → Little Lamb Landing → reCAPTCHA v3**, or (cleaner) recreate the v3
> key *inside* the Firebase App Check flow so the secret auto-links, and replace the site key
> in `.env.production`. Also confirm the key type is **reCAPTCHA v3, not Enterprise** — the
> client uses `ReCaptchaV3Provider`; an Enterprise key will not work.
>
> Per `docs/app-check-runbook.md` Part 3, console-side **enforcement** intentionally waits
> 24–48h after deploy so metrics can confirm real verified traffic before hard-rejecting.

---

## Deploy — what unblocks now

Functions need a deploy for the client's prod build to work end-to-end:

```bash
# from repo root
npx firebase deploy --only functions --project littlelamb-sb
```

Secrets (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`) bind automatically via the `secrets: [...]`
options — no extra flags.

### Stripe webhook secret — the one remaining Stripe piece (chicken-and-egg)
`STRIPE_WEBHOOK_SECRET` (`functions/src/config.ts:9`, used by `webhook.ts:24,35`) is **not yet
set** — it can't exist until `stripeWebhook` is deployed and its URL registered as an endpoint:

1. Deploy functions (above) → note the deployed `stripeWebhook` URL
   (`https://us-central1-littlelamb-sb.cloudfunctions.net/stripeWebhook` or the v2 run URL).
2. Stripe dashboard (**Test mode**) → Developers → Webhooks → Add endpoint → paste that URL.
   Subscribe to at least `payment_intent.succeeded` and `payment_intent.payment_failed`
   (what `webhook.ts` handles).
3. Copy the endpoint's signing secret (`whsec_…`) and set it — **David must run this**, not you
   (secret must not pass through chat):
   ```bash
   npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project littlelamb-sb
   ```
4. Redeploy functions so the new secret version binds.

---

## Still open (not this session's to close)

1. **Wix DNS** — domain still resolves to a Wix IP (`216.198.79.1`), i.e. NOT Firebase
   Hosting. David is confirming with Lucy 2026-08-12 who controls the Wix account. Blocks:
   Firebase Hosting custom-domain connect **and** Resend domain verification (both need DNS
   records).
2. **Resend domain verification** — waits on the DNS decision above.
3. **Live keys** — `.env.production` holds `pk_test_…`; must become `pk_live_…` (and the
   secret rotated to `sk_live_…` in Secret Manager) before real families are onboarded, or
   checkout appears to work and bills nobody. Comment in `.env.production` flags this.
4. **Lucy's content** — badge list, policies, bios. Blocks launch, not deploy.

---

## One-glance state of `.env.production` (client-public values only)
- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_…` ✅
- `VITE_FIREBASE_APPCHECK_SITE_KEY` = `6L…` ✅ (verify token acceptance at deploy)
- Firebase config values unchanged.

---

## Session record (for the log)

**What was done:** Provisioned three account/console launch-blockers with David driving the
consoles. Stripe test keys (publishable → `.env.production`, secret → Secret Manager), Resend
API key → Secret Manager, App Check reCAPTCHA v3 site key → `.env.production`. Every secret
verified by reading it back (redacted), not assumed. Wrote this handoff + the
`2026-08-12-talk-to-lucy.md` meeting prep.

**Decisions / notes (and why):**
- Kept everything in **Stripe test mode** — live keys need business verification and would
  charge real cards; test mode unblocks full billing verification now. Live swap is a
  pre-onboarding step, flagged in `.env.production`.
- App Check key was created in the **Cloud reCAPTCHA console** (flow drifted toward
  Enterprise/WAF), *then* v3 was registered in Firebase App Check separately. This leaves a
  **linkage risk**: the site key in `.env.production` may not be the one whose secret is bound
  to the Firebase provider. Chose to accept the key as-is and **verify at deploy** (metrics
  page) rather than churn the console tonight — recorded loudly above so the deploy session
  checks it.
- Resend real sending deferred: sender is hardcoded to `hello@littlelambnannies.com`, which
  needs domain verification (DNS), which waits on the Wix decision. Key is in regardless.

**Current state:** Repo change is limited to `.env.production` (two client-public keys). No
functions deployed. `STRIPE_WEBHOOK_SECRET` still unset (chicken-and-egg with deploy). Tests
unaffected (no code logic touched). DNS still points at Wix.

**Next steps:**
1. (David + Lucy, 2026-08-12) DNS/Wix access + content — see `2026-08-12-talk-to-lucy.md`.
2. (Engineering session) Deploy functions; then register the Stripe webhook and set
   `STRIPE_WEBHOOK_SECRET` (David runs the secret command); verify App Check tokens on the
   metrics page — see §Deploy and the App Check caveat above.
3. Before onboarding real families: swap `pk_test_`/`sk_test_` → live keys.

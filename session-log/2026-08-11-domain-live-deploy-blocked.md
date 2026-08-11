# 2026-08-11 (late) — Domain live; functions deploy blocked on one missing secret

## Context

This session cleared every remaining launch blocker except two: a Cloud Functions deploy that
failed, and a small set of console tasks. **The domain is live.** `littlelambnannies.com` now
resolves to Firebase Hosting and serves the pre-launch landing page; SSL was still provisioning
when the session ended.

The big news is that **the Wix risk evaporated** — the domain was transferred to David, so there
is no unreachable former owner. That was the only blocker that could have pushed launch to
October. The critical path is now just work.

---

## What happened this session

**Domain went live.** DNS propagated (root + `www` → `199.36.158.100`), the Wix parking IP and a
stale Vercel `www` record are gone, and Fastmail's MX/DKIM/SPF/DMARC were left untouched so the
existing inbox keeps working.

One trap worth remembering: the domain had been verified against the **bare `littlelamb-sb`
site**, which had nothing deployed — so the apex was pointed at a Firebase 404. Rather than redo
the domain connection (which restarts ACME validation), a `root` hosting target was added,
cloned verbatim from `landing`, and the landing build deployed to it. Same CSP, headers and
rewrite; only `public` differs. Committed.

**Everything else engineering-side is green:** client 70 / functions 44 / rules 23 = **137**
tests, tsc clean, eslint 0 findings in both npm projects, both builds OK, all pushed.

---

## THE ONE BUG TO FIX FIRST — root cause already found

`npm run deploy:functions:prod` failed with **all 7 functions** reporting the same error:

> Container Healthcheck failed. The user-provided container failed to start and listen on the
> port defined provided by the PORT=8080 environment variable.

**Root cause: `STRIPE_WEBHOOK_SECRET` does not exist in Secret Manager.** Verified directly —
`RESEND_API_KEY` and `STRIPE_SECRET_KEY` both read back fine; the third returns nothing.

`functions/src/config.ts:9` declares it with `defineSecret`, and the CLI validates **every
declared secret** at deploy time, so a single missing one takes down the whole batch — including
`recurringAutoCancel`, which has nothing to do with Stripe. Only `billing/webhook.ts:24` actually
binds it.

This is the chicken-and-egg the console handoff predicted (the `whsec_` can't exist until
`stripeWebhook` is deployed and registered in Stripe), just biting harder than expected.

**The fix — set a placeholder, deploy, then swap in the real value:**
```
npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project littlelamb-sb
# any non-empty placeholder, e.g. whsec_placeholder
npm run deploy:functions:prod
```
Safe: `webhook.ts:35` only reads it inside the request handler, so a placeholder means signature
verification fails on incoming webhooks — it does not prevent startup. Nothing else touches it.

**A subagent investigation ruled out all five code-level hypotheses** — do not re-derive these:
module-scope `.value()` calls (all three are correctly lazy), `lib/` not shipping (the CLI
ignores `.gitignore`; only `firebase.json`'s `ignore` applies), missing runtime deps, Node 22 vs
20 syntax (zero matches for newer syntax in `lib/`), and pdfkit at module scope. The code is fine.

---

## My work plan, in order

### 1. Deploy the functions (the blocker above)
Placeholder secret → deploy → verify. Expect *secondary* first-deploy failures now that the
secret issue is cleared: GCP API enablement (Cloud Build, Artifact Registry, Eventarc, Cloud
Scheduler), IAM propagation, Eventarc permissions for the two `onDocumentCreated` triggers.

Then verify on real infrastructure:
- `firebase functions:list --project littlelamb-sb` — 7 functions in `us-central1`
- Cloud Scheduler shows 2 jobs: `recurringAutoCancel` (hourly), `quarterlyCharge` (daily 08:00 PT)
- Write a `waitlist` doc → confirm `onWaitlistCreated` fires

**Verified safe — nobody gets charged.** Three independent gates: `config/billing.enabled` read
with strict `=== true`, defaulting to dry-run when absent (`billing/quarterlyCharge.ts:54`); the
Stripe call fenced behind `if (enabled)` (line 137); and no family has a saved card (line 85).

### 2. Stripe webhook, for real
Read the deployed URL from the deploy output. **It is a v2 function**
(`firebase-functions/v2/https`), so the URL is Cloud Run-style
(`https://stripewebhook-<hash>-uc.a.run.app`) — **not** the `cloudfunctions.net` shape the
console handoff predicted. Registering the wrong URL fails silently until a real payment.

David registers the endpoint and sets the real `whsec_`; I redeploy so the new version binds.

### 3. Resend domain verification
Turns on all platform email. ⚠️ **The SPF records must be MERGED, not added.** A second `TXT`
SPF record is invalid and breaks *both* Fastmail and Resend. Current value:
`v=spf1 include:spf.messagingengine.com ?all` — I'll write the merged value once David has the
Resend records.

### 4. Deploy the app itself
`littlelamb-sb-app` **does not exist as a hosting site** and the app has never been deployed —
only the landing page has. Create the site, add a `deploy:app:prod` script (none exists;
`deploy:landing:*` only ships `hosting:landing`), deploy, then decide whether the apex domain
moves from the landing page to the app.

### 5. Verify App Check tokens
Only possible once the app is deployed and minting tokens from a real browser. The reCAPTCHA key
was created in the **Cloud console** (near the Enterprise/WAF flow) and v3 registered
*separately* in Firebase, so the site key may not be the one bound to the provider — in which
case every token is rejected and card capture returns 401.

Check Firebase Console → App Check → APIs for the Verified/Invalid split. If invalid: recreate
the v3 key *inside* Firebase → App Check so the secret auto-links, then swap `.env.production`
and rebuild. Enforcement stays off 24–48h per `docs/app-check-runbook.md` Part 3.

### 6. End-to-end pass, all three roles
Family signup → admin approval → nanny signup → booking → confirmation email + iCal → billing
dry-run. First time the whole system runs together against live Firebase. **Budget a full session
and expect findings** — every piece is unit-tested, but integration bugs are near-certain.

---

## DAVID'S CHECKLIST

### Do first — unblocks everything (5 min)
- [ ] **Set the Stripe webhook placeholder** (this is what's blocking the deploy):
      `npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project littlelamb-sb`
      → enter any non-empty value, e.g. `whsec_placeholder`. Real value comes later.

### Domain housekeeping (10 min, in the Wix DNS editor)
- [ ] **Turn ON auto-renew** — expires **Apr 13 2027**, currently OFF. A lapsed domain takes the
      whole site down and becomes publicly registerable.
- [ ] **Update the domain contact info** — Wix flagged this after the transfer.
- [ ] Check `https://littlelambnannies.com` — should serve the landing page once SSL provisions
      (was still in progress at session end; up to 24h is normal).
- [ ] **What is `lucy.littlelambnannies.com`?** Points at `103.168.172.37` / `.52`. Delete if
      it's a leftover.
- [ ] **DKIM typo:** `mesmtp._domainkey` → `mesmtp.littlelamb.com.dkim.fmhosted.com` is missing
      "nannies". That Fastmail key won't validate.

### After the functions deploy (I'll tell you the URL)
- [ ] **Stripe → Test mode → Developers → Webhooks → Add endpoint.** Paste the URL I give you.
      Subscribe to exactly two events: `payment_intent.succeeded` and
      `payment_intent.payment_failed`.
- [ ] Copy the `whsec_…` signing secret and run the `secrets:set` command again to replace the
      placeholder. **Never paste a secret into chat.**

### Resend (turns on all email)
- [ ] **Resend → Domains → Add `littlelambnannies.com`.** Send me the records it shows —
      ⚠️ do NOT add the SPF record yourself, it must be merged with the Fastmail one.

### Before real families use it
- [ ] **Stripe business verification** — needed for live keys, can take days. **Start this early**
      so it isn't the last thing holding up launch.
- [ ] **Lucy's content** — badge list, policies text, founder bios, real nanny profiles.
      (Meeting doc: https://claude.ai/code/artifact/930cebc0-aafc-4a12-a9f3-185d64713bad)
- [ ] **Swap to live payment keys** — `pk_live_` in `.env.production`, rotate
      `STRIPE_SECRET_KEY` to `sk_live_`, register a live-mode webhook, then flip
      `config/billing.enabled` on from admin settings.
      ⚠️ **Until this, checkout appears to work and bills nobody.**

---

## Verification (how I'll know it worked)

- `npx firebase functions:list --project littlelamb-sb` → 7 functions, `us-central1`
- Cloud Scheduler → 2 jobs registered
- A `waitlist` doc write fires `onWaitlistCreated`; with an unverified sender domain it should
  fail **at the send step** with a Resend domain error — informative, and it surfaces in the
  Undelivered email dashboard section added this session
- `curl -sI https://littlelambnannies.com` → 200 with a valid cert
- Full suite stays green: `npm test` (70) / `npm run test:functions` (44) / `npm run test:rules`
  (23), plus `npm run lint` at `--max-warnings 0`

## Revised estimate

**~1.5–2 weeks of elapsed time**, roughly 8–10 hours of my work, gated mostly on Stripe business
verification and Lucy's content rather than engineering. Down from 4–6 weeks: the domain is live
and the Wix owner risk is gone.

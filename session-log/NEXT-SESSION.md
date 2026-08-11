# Next session plan — deploy the backend, then finish

**Start by reading:** `CLAUDE.md`, `DECISIONS.md` (esp. D59–D64), `session-log/README.md`, the
2026-08-11 evening entry + `2026-08-11-console-secrets-handoff.md`, then `git log --oneline -12`.

**Branch:** `landing-page-prelaunch` (pushed, tracking `origin`). Commit per section.

> **Do NOT run `npx prettier`** — no prettier config exists; it reformats to a style this
> codebase doesn't use.

---

## State as of 2026-08-11 (end of session)

**Green: client 70 / functions 44 / rules 23 = 137.** tsc clean, eslint **0 findings** in both
npm projects (root runs `--max-warnings 0`), both builds OK, everything pushed.

**All four console blockers are provisioned and independently verified this session:**

| Item | Where | Verified |
|---|---|---|
| Blaze plan | `littlelamb-sb` | ✅ |
| Firestore backups + PITR | `littlelamb-sb` | ✅ |
| Firestore indexes (6 composite) | deployed to prod | ✅ |
| `STRIPE_SECRET_KEY` (`sk_test_`) | Secret Manager | ✅ read back |
| `RESEND_API_KEY` (`re_`) | Secret Manager | ✅ read back |
| `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_test_`) | `.env.production` | ✅ in prod bundle |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` (`6L…`, 40ch) | `.env.production` | ✅ in prod bundle |

**`STRIPE_WEBHOOK_SECRET` is NOT set** — verified absent, and this turned out to be the thing
that **broke the whole functions deploy** (see §1). It needs a *placeholder* value BEFORE
deploying; the real `whsec_` can only be issued after `stripeWebhook` exists and is registered
in Stripe.

**The domain is LIVE.** `littlelambnannies.com` resolves to Firebase Hosting and serves the
pre-launch landing page (SSL was still provisioning at session end). **The 7 functions are
still not deployed** — that attempt failed, root cause found, fix in §1.

---

## 1. FIRST: unblock the functions deploy — root cause already found

**The deploy was attempted 2026-08-11 and ALL 7 functions failed** with the same error:
"Container Healthcheck failed... failed to start and listen on the port defined by PORT=8080".

**Root cause: `STRIPE_WEBHOOK_SECRET` does not exist in Secret Manager.** Verified directly —
`RESEND_API_KEY` and `STRIPE_SECRET_KEY` read back fine; the third returns nothing.
`functions/src/config.ts:9` declares it via `defineSecret`, and the CLI validates **every
declared secret** at deploy time, so one missing value takes down the whole batch — including
`recurringAutoCancel`, which has nothing to do with Stripe. Only `billing/webhook.ts:24` binds it.

**Fix — placeholder, deploy, swap later:**
```
npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project littlelamb-sb
# any non-empty value, e.g. whsec_placeholder
npm run deploy:functions:prod
```
Safe: `webhook.ts:35` reads it only inside the request handler, so a placeholder means incoming
webhook signatures fail verification — it does not prevent startup.

**Five code-level hypotheses were investigated and RULED OUT — do not re-derive:** module-scope
`.value()` calls (all three are correctly lazy), `lib/` not shipping (the CLI ignores
`.gitignore`; only `firebase.json`'s `ignore` applies), missing runtime deps, Node 22-vs-20
syntax (zero matches in `lib/`), pdfkit at module scope. The code is fine.

Once past this, expect *secondary* first-deploy failures: GCP API enablement (Cloud Build,
Artifact Registry, Eventarc, Cloud Scheduler), IAM propagation, Eventarc permissions for the two
`onDocumentCreated` triggers.

**Verified safe — nobody gets charged.** Three independent gates: `config/billing.enabled` read
with strict `=== true`, defaulting to dry-run when absent (`billing/quarterlyCharge.ts:54`); the
Stripe call fenced behind `if (enabled)` (line 137); no family has a saved card (line 85).

**Then verify on real infrastructure:**
- `firebase functions:list --project littlelamb-sb` — 7 functions, `us-central1`
- Cloud Scheduler shows 2 jobs: `recurringAutoCancel` (hourly), `quarterlyCharge` (daily 08:00 PT)
- Write a `waitlist` doc → `onWaitlistCreated` fires; with an unverified sender domain it should
  fail **at the send step** with a Resend domain error, visible in the Undelivered email section

## 2. Stripe webhook — the chicken-and-egg

1. Note the deployed `stripeWebhook` URL. **It is a v2 function**
   (`firebase-functions/v2/https`), so the URL is Cloud Run-style
   (`https://stripewebhook-<hash>-uc.a.run.app`) — **not** the v1 `cloudfunctions.net` shape
   the console handoff predicted. Read it from the deploy output.
2. **David** (Stripe dashboard, **Test mode**) → Developers → Webhooks → Add endpoint → paste
   the URL. Subscribe to exactly the two events `webhook.ts:70,74` handles:
   `payment_intent.succeeded` and `payment_intent.payment_failed`.
3. **David runs this** — the secret must never pass through chat:
   ```
   npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project littlelamb-sb
   ```
4. Redeploy so the new secret version binds.

## 3. App Check — verify the token binding, treat as a real risk

The reCAPTCHA key was created in the **Google Cloud** console (the flow drifted near
Enterprise/WAF) and v3 was registered **separately** in Firebase App Check. So the site key in
`.env.production` may not be the one whose secret is bound to the Firebase provider — in which
case every token is rejected.

Key format checks out (40 chars, `6L` prefix, and both `src/lib/firebase.ts:45` and
`src/landing/firebase.ts:49` use `ReCaptchaV3Provider`) — but shape does not prove binding.
An Enterprise key looks identical and will not work.

**Verify:** Firebase Console → App Check → APIs → watch the Verified / Unverified / **Invalid**
split over ~15 min of real traffic.

**Fix path if invalid:** recreate the v3 key *inside* Firebase → App Check → register app →
reCAPTCHA v3, so the secret auto-links. Cleaner than back-linking the Cloud-console key. Then
replace the value in `.env.production` and rebuild.

> **Blocker to know about:** `littlelamb-sb-app` **does not exist as a hosting site** (only
> `littlelamb-sb` and `littlelamb-sb-landing` do), and the app has never been deployed. So no
> browser currently loads the app bundle and mints tokens. The **landing page is the only live
> surface**, and it initialises App Check with the same key — so it is the practical test bed,
> but it never calls the billing callables, so it exercises the key without exercising the
> enforced path. Creating the site + deploying the app is what makes a real end-to-end test
> possible.

Console-side **enforcement** stays off for 24–48h per `docs/app-check-runbook.md` Part 3. The
code-side `enforceAppCheck: true` on `createSetupIntent`/`savePaymentMethod` is live regardless,
so a bad key means card capture returns 401 rather than degrading quietly.

## 4. Resend — recommendation: WAIT for DNS

Do **not** wire the temporary `onboarding@resend.dev` sender. Reasoning:

- It is a code change to production config (`config.ts:15`) working around a DNS problem, and it
  puts a `resend.dev` address in the codebase where it can be forgotten and shipped.
- It proves little. The deploy already exercises the hard parts — secret binding, the Firestore
  trigger, the mail-doc claim transaction, quota metering — all of which run *before* the
  provider call. The untested slice is "does Resend accept our key", the most reliable link.
- With a real key in place, a `mail` doc now fails at the send step with a clean domain error,
  visible in the Undelivered email dashboard section.

If DNS slips past ~2 weeks, revisit — but as an **env-gated** `MAIL_FROM_OVERRIDE`, never a
hardcoded swap.

---

## 5. Once DNS lands — the actual path to launch

This is the whole remaining sequence. Steps 1–4 above are independent of DNS; everything here
depends on it.

**a. ~~Point the domain at Firebase Hosting.~~ DONE 2026-08-11.** Root + `www` resolve to
`199.36.158.100`; the Wix parking IP and a stale Vercel `www` record are gone; Fastmail's
MX/DKIM/SPF/DMARC left intact. The apex had been verified against the BARE `littlelamb-sb` site
(empty → 404), so a `root` hosting target was added, cloned from `landing`, and the landing build
deployed to it. SSL was still provisioning at session end.

**b. Verify the Resend domain.** Resend → Domains → add `littlelambnannies.com` → add the
SPF/DKIM records. This makes `hello@littlelambnannies.com` a legal sender and turns the entire
email pipeline on. Test by writing a `mail` doc and confirming delivery.

**c. Create the app hosting site and deploy the app.** `littlelamb-sb-app` doesn't exist yet —
create it, then deploy `dist/`. There is **no npm script for this**; `deploy:landing:*` only
ships `hosting:landing`. Add `deploy:app:prod` alongside the existing scripts.

**d. End-to-end pass on the real domain, all three roles.** Family signup → admin approval →
nanny signup → booking → confirmation email + iCal invite → billing dry-run. This is the first
time the whole system runs together; budget a full session and expect findings.

**e. Swap in Lucy's content.** Badge master list, policies text, founder bios, real nanny
profiles. String swaps, but they gate showing the site to real families.

**f. Go live on payments.** Replace `pk_test_` with `pk_live_` in `.env.production`, rotate
`STRIPE_SECRET_KEY` to `sk_live_`, register a **live-mode** webhook endpoint and set its
`whsec_`, then flip `config/billing.enabled` to true from the admin settings page.
**Until this happens, checkout appears to work and bills nobody** — the single most dangerous
state in the project, and the reason `.env.production` carries a loud warning.

---

## 6. Smaller code items (none blocking)

- **Component tests for the remaining admin pages.** `AdminDashboard`'s partial-queue logic is
  the most valuable next one — it is where the D61-class bug was worst.
- **`CLAUDE.md` "superseded" banner** for the removed messaging spec (Part 12, §4.8/4.9, admin
  §9, nav lists). Left as historical per D44, but a future contributor could build removed
  features from it. It already caused one real error: the console session's Lucy prep asked
  about "Replied by Lucy/David" tagging in Messages, a feature that no longer exists.
- **`useNannyDirectory`** deliberately excluded from the pagination work (D60) — it is a
  one-shot `getDocs` and needs its own helper, not the snapshot-shaped one.
- **Staging project is not on Blaze**, so `deploy:functions:staging` and
  `deploy:indexes:staging` fail until it is.

## 7. Closed — do not re-attempt

- **Landing bundle / LazyMotion (D64).** Built and measured **worse** (287,720 → 289,817
  bytes). framer-motion's core renderer is a static dependency of `m` and cannot be deferred.
  The only real lever is dropping framer-motion from the landing entirely, which David declined
  — the design system mandates spring physics and ~97KB gzipped is fine.

---

## Go-live estimate

**~1.5–2 weeks elapsed**, roughly 8–10 hours of engineering — down from 4–6 weeks.

**The Wix risk is gone.** The domain was transferred to David, so there was never an unreachable
former owner to chase, and the domain is now live on Firebase. That was the only blocker that
could have pushed launch into October.

What remains is gated on **Stripe business verification** (needed for live keys, can take days —
start it early) and **Lucy's content**, not on engineering. Full detail in
`2026-08-11-domain-live-deploy-blocked.md`, including David's checklist.

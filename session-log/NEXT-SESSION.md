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

**`STRIPE_WEBHOOK_SECRET` is NOT set** — verified absent. It cannot exist until `stripeWebhook`
is deployed and its URL registered in Stripe. This is the one chicken-and-egg in the sequence.

**Nothing is deployed.** The 7 functions have still never run on Google infrastructure.

---

## 1. FIRST: deploy the functions

```
npm run deploy:functions:prod
```

**Confirm with David before running** — he paused this deliberately last session to watch it
rather than have it run unattended.

Secrets bind automatically via each function's `secrets: [...]` option. **Expect a first-deploy
failure**: GCP API enablement (Cloud Build, Artifact Registry, Eventarc, Cloud Scheduler,
Secret Manager), IAM propagation on the default service account, or Eventarc permissions for
the two `onDocumentCreated` triggers. Read the real error; don't guess.

`stripeWebhook` may refuse to deploy with `STRIPE_WEBHOOK_SECRET` unset. If so, set a throwaway
placeholder to get the URL, then follow §2.

**Verified safe — nobody gets charged.** Three independent gates: `config/billing.enabled` read
with strict `=== true`, defaulting to dry-run when the doc is absent
(`billing/quarterlyCharge.ts:54`); the Stripe call fenced behind `if (enabled)` (line 137); and
no family has `stripeCustomerId` + `hasPaymentMethod` on a fresh project (line 85).

**Then verify on real infrastructure:**
- `firebase functions:list --project littlelamb-sb` — 7 functions, `us-central1`
- Cloud Scheduler shows 2 jobs: `recurringAutoCancel` (hourly), `quarterlyCharge` (daily 08:00 PT)
- `firebase functions:log` — cold-start errors
- Write a `waitlist` doc and confirm `onWaitlistCreated` fires. With a real Resend key but an
  unverified sender domain it will fail **at the send step** with a domain error — informative,
  and it surfaces in the new Undelivered email dashboard section.

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

**a. Point the domain at Firebase Hosting.** Firebase Console → Hosting → Add custom domain →
`littlelambnannies.com` → add the TXT/A records at the registrar. Propagation is minutes to
48h; SSL provisions automatically after.

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

**~4–6 weeks — mid-to-late September 2026**, unchanged.

Every blocker that engineering or money could solve is now solved. The critical path is
**Wix DNS**: unknown owner, unbounded response time, no workaround. Steps 5a–5f are perhaps
two working sessions once DNS lands — the estimate is almost entirely waiting, not building.

If DNS resolves quickly, early September is achievable. If the Wix owner is unreachable, the
fallback is launching on a different domain, which costs the brand but not the product.

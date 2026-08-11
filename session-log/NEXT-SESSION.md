# Next session plan

**Start by reading:** `CLAUDE.md`, `DECISIONS.md` (esp. D59–D64), `session-log/README.md` + the
2026-08-11 evening entry, then `git log --oneline -8`.

**Branch:** continue on `landing-page-prelaunch` (now pushed, tracking `origin`). Commit per section.

> **Do NOT run `npx prettier`** — no prettier config exists here; it reformats files to a
> style the codebase doesn't use.

---

## Context

**Blaze is live on `littlelamb-sb`. Backups + PITR are enabled. Indexes are deployed.** The
five-sessions-deferred data-loss risk is closed, and the backend is unblocked for the first time.

Green: client **70** / functions 44 / rules 23 = **137**. tsc clean, eslint **0 findings** in
both npm projects (root now runs `--max-warnings 0`), both builds OK.

---

## 1. FIRST: deploy the functions to prod

Everything is prepared. Three placeholder secrets are in Secret Manager (the Stripe
**publishable** key is real and wired into `.env.production`/`.env.staging`; the secret key is
still a placeholder), the predeploy
lint gate is fixed (D59), and indexes are live (D62). David paused the deploy last session to
watch it run rather than have it happen unattended — **confirm he's ready before running it.**

```
npm run deploy:functions:prod
```

**Expect it to fail at least once.** Likely, in order: GCP APIs not yet enabled (Cloud Build,
Artifact Registry, Cloud Scheduler, Secret Manager, Eventarc); IAM propagation delay on the
default service account; Eventarc permissions for the two `onDocumentCreated` triggers. Read the
actual error rather than guessing — a real first deploy is the entire point.

**Verified safe:** `quarterlyCharge` charges nobody. Three independent gates —
`config/billing.enabled` read with strict `=== true` and defaulting to dry-run when the doc is
absent (`billing/quarterlyCharge.ts:54`), the Stripe call fenced behind `if (enabled)` (line 137),
and no family on a fresh project has `stripeCustomerId` + `hasPaymentMethod` to reach it (line 85).

Then verify on real infrastructure:
- `firebase functions:list --project littlelamb-sb` — all 7 present, `us-central1`
- Cloud Scheduler shows 2 jobs: `recurringAutoCancel` (hourly), `quarterlyCharge` (daily 08:00 PT)
- `firebase functions:log` — check for cold-start errors
- **End-to-end:** write a `waitlist` doc, confirm `onWaitlistCreated` fires. With a placeholder
  Resend key it should fail *at the send step* — that is the informative outcome, proving the
  trigger, Firestore wiring and secret mount all work while isolating the one known placeholder.

## 2. Landing bundle — CLOSED, do not re-attempt

**LazyMotion was tried and measured WORSE** (287,720 → 289,817 bytes). See D64. The split
worked, but framer-motion's core renderer is a static dependency of `m` and cannot be
deferred. The only remaining lever is removing framer-motion from the landing tree entirely
(all 14 usages are hover/tap effects CSS could express) — **David decided against it**: the
design system mandates spring physics, and ~97KB gzipped loads fine.

## 3. Smaller code items — all three DONE this session

- ✅ `--max-warnings 0` ratchet — the three react-refresh warnings are cleared and the gate
  is verified to go red on one new warning.
- ✅ Mail quota admin surface — `useUndeliveredMail` + a dashboard section.
- ✅ AdminPeoplePage error-state tests — verified against the pre-D61 code (2 of 4 fail).

**What's actually left that needs no keys:** not much. Candidates, in rough order of value:
- Component tests for the other admin pages (AdminDashboard's partial-queue logic is the
  next-most valuable, being where the D61-class bug was worst).
- The `CLAUDE.md` "superseded" banner for the removed messaging spec (D44) — a future
  contributor could still build removed features from it.
- `functions/` has no lint-staged/pre-commit hook; CI is the only gate.

---

## 4. Blocked on David — console/account tasks

**Use the `launch-concierge` agent for these** (`.claude/agents/launch-concierge.md`) — it has all
the project IDs, click-paths and current state, and is built to run in a parallel terminal.

- ✅ ~~Blaze upgrade~~ — **done 2026-08-11**
- ✅ ~~Firestore backups / PITR~~ — **done 2026-08-11**
- **Stripe test keys** — highest value remaining. 15 min, no business verification needed, and
  unblocks verifying the entire billing engine end-to-end.
- **Resend API key** — note it is *not* blocked by DNS: `onboarding@resend.dev` works immediately
  for testing the pipeline. Domain verification for the real sender needs DNS.
- **App Check reCAPTCHA v3 key** — paste-and-go, no code change. But `createSetupIntent` and
  `savePaymentMethod` both set `enforceAppCheck: true`, so **card capture is dead-on-arrival**
  until it exists.
- **Wix DNS access** for `littlelambnannies.com` — owner unknown, possibly a former partner.
  **The only blocker that can slip launch by months**, and the only one with no workaround.
- **Lucy's content** — badge master list, policies text, founder bios, cancellation policy.

## 5. Open product decision
- **Nanny cancellation request channel.** D44 removed in-app messaging and the spec routed nanny
  cancellations through it, so there is currently **no in-app mechanism** for a nanny to request
  one. Handled off-platform until Lucy decides.

## 6. Known-deferred, documented
- `CLAUDE.md` still contains the obsolete messaging spec (Part 12, §4.8/4.9, admin §9, nav lists),
  left as historical per D44 — a future contributor could build removed features from it. Worth a
  "superseded" banner.
- `useNannyDirectory` deliberately excluded from the pagination work (D60) — it is a one-shot
  `getDocs`, and it would need its own helper rather than the snapshot-shaped one.
- Staging project `littlelamb-sb-staging` is **not** on Blaze, so `deploy:functions:staging` and
  `deploy:indexes:staging` will fail until it is.
- Dev-only npm advisories and one upstream `uuid` inside `firebase-admin` (D42).

---

## Go-live estimate

**~4–6 weeks — mid-to-late September 2026** (was 6–9 before Blaze landed).

The critical path is no longer code — it is **Wix DNS**, which has an unknown owner and unbounded
response time. Everything else has a workaround. The app can reach feature-complete-and-verified
on a `*.web.app` URL with nothing more than Stripe test keys.

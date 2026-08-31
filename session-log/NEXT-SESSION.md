# Next session — push + CI, then Gate 2 (first deploy)

**Start by reading:** `CLAUDE.md` (esp. § Testing — test-first is a hard rule), `DECISIONS.md`
D66–D69, `session-log/2026-08-30-error-handling-and-a11y.md` (most recent), then
`git log --oneline -12`.

**Branch:** `landing-page-prelaunch`. **7 commits ahead of its upstream** (4 landed 2026-08-30),
90 ahead of `main`. Tree clean; `scratchpad/` is now gitignored.

> ⚠️ **First thing next session: PUSH and confirm CI green.** The unpushed count is large and has
> never run on a real runner. Everything below assumes that's done.

---

## State

**Green: ~355 client / 95 functions / 49 rules.** tsc clean, lint 0, both builds OK.
**Nothing is deployed. Nothing is public.** The apex still serves the pre-launch landing page.

**2026-08-30 landed (all committed, all green):** silent-failure sweep across every fire-and-forget
async action; Modal focus trap + visible ✕; MonthGrid colour-independent status (WCAG 1.4.1);
**storage reads scoped owner-or-approved** (were `isSignedIn()` — a privacy hole); and the **rules
past-date backstop re-anchored to Pacific** (`+1d+8h`) after the suite caught it accepting
yesterday late in the UTC day. The rules + storage changes are what `deploy:rules:prod` will
actually ship — read that diff line-by-line at Gate 2.

Verified against real infrastructure:

| | |
|---|---|
| 7 Cloud Functions | ACTIVE, containers healthy (running the **pre-Wave-1** code) |
| Prod billing | **SAFE** — `enabled:false, invoiced:0` every run; Stripe key `sk_test_` |
| App | `littlelamb-sb-app.web.app`, unpromoted |
| `STRIPE_WEBHOOK_SECRET` | ❌ `placeholder-not-a-real-key` |
| Resend DNS | ❌ absent — **and the apex SPF record is GONE entirely** |

**The local lab works.** `npm run emulators:all` + `npm run seed` + `npm run billing:local` produced
a $27.00 `dryRun` invoice with PDF, advanced the cycle 90 days, and delivered both invoice emails to
`status:sent` with **nothing leaving the machine**.

---

---

## 0. FIRST — finish the recurring checkbox (~30 min, everything else is ready)

The tested logic landed in `35c8482`; only the UI control is missing, so `recurring: true` is still
set nowhere and the whole recurring subsystem stays unreachable.

The test-first draft is already written: `docs/wip/FamilyCalendarPage.recurring.test.tsx.draft`.
Move it to `src/pages/family/FamilyCalendarPage.test.tsx`, confirm it fails for the right reason
(`createBooking` never called), then add the checkbox gated on `resolveRecurring()` from
`src/lib/recurring.ts`, then watch it pass. See `docs/wip/README.md`.

## 0b. Two known bugs, documented and deliberately NOT fixed

- **The webhook missing-invoice race** (`functions/src/billing/webhook.ts`). `markInvoice` does a
  read-then-write and silently no-ops when the invoice doc doesn't exist, so a webhook that beats
  `quarterlyCharge`'s `writeInvoice` **drops the paid status** and the invoice stays `pending`
  forever though Stripe took the money. Pinned by a test asserting the current behavior. Fix before
  billing goes live — it's a behavior change and deserves its own reviewed commit.
- **The two money bugs in `Backlog.md`** (rates hardcoded in 3 UIs; `total` vs `totalCents`). Held
  for David's review. The 100× warning lives on the `Invoice` type itself.

## 1. Stripe CLI — real signed webhooks locally (~1h)

The only part of the money path not yet exercised. Everything else is proven.

```
brew install stripe/stripe-cli/stripe     # Homebrew 5.0.5 present, CLI absent
stripe login
npm run emulators:all                      # shell 2
stripe listen --forward-to http://127.0.0.1:5001/littlelamb-demo/us-central1/stripeWebhook
```
`stripe listen` prints **its own** `whsec_` → `functions/.secret.local` (gitignored).
⚠️ **That value is not the prod webhook secret and must never be pasted into prod.**

- Bare `stripe trigger payment_intent.succeeded` carries **no `metadata.invoiceId`**, so it only
  exercises signature verification + the `stripe_events` duplicate guard. To test reconciliation,
  create the PI explicitly with `--metadata[invoiceId]=<a real seeded invoice id>`.
- Assert: succeeded → invoice `paid`; `pm_card_chargeDeclined` → `failed` **and exactly one**
  `billing_alerts` doc; `stripe events resend <evt>` → `duplicate`, **no second alert**.

## 2. Full three-role manual pass on the emulator (~1.5h)

`npm run emulators:all`, `npm run seed`, `npm run dev`. Accounts: `family@` / `nanny@` / `admin@`
`littlelamb.test`, password `lamb1234`.

Family signup → admin approves → nanny signup → admin approves → **assign verified badges** (new
this session) → family books → nanny accepts → nanny declines another → family cancels a third.
After each, check the `mail` collection in the emulator UI: every doc should reach `status:'sent'`
with the right recipients, and **the decline must be addressed to the family** (the bug fixed in
`950012d`/`f0fb5e7`). Expect UI findings — this is the first full run-through.

## 3. Gate 2 — first deploy (app stays OFF the public domain) (~2h + David)

1. Push the 13 commits; confirm CI green.
2. `npm run deploy:rules:prod` — read the rules diff line by line first.
3. `npm run deploy:functions:prod` — **prod is running pre-Wave-1 code**, so this is what actually
   ships the billing fix. Re-verify all 7 ACTIVE; watch logs 15 min.
4. Confirm `config/billing.enabled` is still false **immediately before and after** the deploy.
5. **David's console tasks** (`docs/david-launch-checklist.md`, refreshed this session):
   - **Resend DNS.** ⚠️ Re-verified 2026-08-18: the apex has **no SPF record at all** — only
     Firebase's `hosting-site` TXT. So this is an **ADD, not a merge**, and it must cover both
     senders in **one** record: `v=spf1 include:spf.messagingengine.com include:amazonses.com ?all`.
     (Send me exactly what Resend shows before saving.) Fastmail MX + `fm1._domainkey` + DMARC are
     intact. Side note: Fastmail mail is currently sending unauthenticated.
   - **Stripe test-mode webhook** → `https://us-central1-littlelamb-sb.cloudfunctions.net/stripeWebhook`,
     events `payment_intent.succeeded` + `payment_intent.payment_failed`, then
     `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`. Redeploy after.
   - **First admin** — `node scripts/make-admin.mjs <email> "<name>"` with a service-account key
     (delete the key after).
   - **Start Stripe business verification NOW** — days-long, and it gates go-live.
6. Repeat the three-role pass on `littlelamb-sb-app.web.app` — real App Check enforcement, real
   email, billing still dry-run.

## 4. Before billing is ever switched on

**`npm run backfill:billing -- --prod`** (reports before writing; `--apply` to commit). Existing
families have no `nextChargeDate` and are invisible to billing. The script never backdates — see
D67 for why that matters.

---

## Do not re-attempt

- **The pubsub emulator for scheduled functions (D69).** The emulator runs no cron. Use
  `npm run billing:local`.
- **LazyMotion on the landing bundle (D64).** Measured worse; David declined the only real lever.
- **Removing `@firebase/app` from `functions/package.json` (D65).** Looks unused, is load-bearing.

## Still open (not blocking a deploy)

- Lucy's content: badge master list, policies text, founder bios, real nanny photos/videos.
  Badges + policies are now admin-editable; the rest are code.
- Settings tabs still dead chrome: Account, Email templates, Calendly (`NannyHoldingPage.tsx:18`
  has a **placeholder Calendly URL** that 404s).
- No tests on the Settings badge-catalog editor (id-collision, rename-preserves-id).
- `useNannyDirectory` excluded from pagination (D60).
- Staging project is not on Blaze, so `deploy:*:staging` fails.

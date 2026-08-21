# 2026-08-18 — Three launch-blocking bugs, and a local lab that proves the money path

## Context

Resumed after a 6-day gap (last commit `bb0bcd6`, 2026-08-11; 6 commits still unpushed). Goal
was to plan the remaining launch work. David added a constraint mid-session that reshaped
everything:

> "I want to be secure with the dev — do anything that doesn't need to be done live in a test
> environment or local database, not actually publishing the site until it's safe and ready."

So: nothing deployed this session, nothing made public. All verification is local.

He also asked that the work be parallelised across agents, and that **tests be written first and
proven to fail** — now a hard rule in `CLAUDE.md`, not a suggestion.

---

## THE THREE BUGS (all found by reading, all previously unknown)

### 1. Quarterly billing would have invoiced nobody, forever
`nextChargeDate` was only ever **read** (`quarterlyCharge.ts:78,87`) or **advanced** (`:105`).
**Nothing in the codebase ever initialized it.** So `where('nextChargeDate','<=',today)` matched
zero docs on every run. Confirmed from **prod logs**: `enabled:false, invoiced:0` on every single
execution since deploy. Switching billing on would have charged nobody while looking successful.

Fixed in `savePaymentMethod` — the moment a family becomes billable — guarded to seed only when
absent, so re-saving a card cannot push an existing cycle out (a test pins that at 90 days of
drift). Also extracted `runQuarterlyCharge(deps)` from the `onSchedule` wrapper.

**Residual, now handled:** the fix only helps cards saved from now on. Existing families needed
`scripts/backfill-billing-cycle.mjs` (below).

### 2. Booking emails were dead at *four* call sites
`setStatus` returns early without `meta`, and **every** call site omitted it —
`NannyDashboard:99,102`, `AdminBookingsPage:85`, and (found later) all three actions in
`BookingsPage`. Nanny accept, nanny decline, family cancel and admin cancel sent **zero** email.

In `BookingsPage` the real defect was the **prop type** — `onAction: (id, s) => void` erased
`meta`/`actor` at the type level, so adding arguments alone would not have compiled.

### 3. A nanny's decline emailed the wrong person
The `cancelled` branch always fired `booking_cancelled_by_family` `to:'nanny'`. When a **nanny
declined**, the nanny was emailed about her own decline and **the family — who has to go rebook —
was never told.** `booking_request_declined` had a template but no call site anywhere.

Fixed with an explicit `actor` param rather than deriving from the signed-in role, because an
admin acts on bookings they are not a party to, so a role lookup is wrong precisely in the admin
case. Admin cancel notifies the nanny (the only cancellation template carrying a CANCEL iCal) and
deliberately **not** the family: the sole family-facing template asserts the nanny couldn't take
the booking, which is false for an override, and a wrong explanation is worse than silence for a
parent who just lost childcare.

---

## Also fixed

- **Fabricated social proof.** The app homepage claimed "Trusted by 120+ Santa Barbara families"
  and a "4.9 rating" for a product with zero customers and admin-only (never public) reviews. Not
  yet public — the apex serves the landing bundle — but live the moment the domain points at the
  app. Replaced with per-nanny guarantees true on day one. The `AvatarStack` was removed too: four
  overlapping hero avatars is the same false claim in picture form, which a text-only fix leaves
  standing.
- **Post-interview badge assignment did not exist.** `verifiedBadges` has been on the nanny type
  since Phase 3 and `firestore.rules` already made it admin-writable and client-immutable, but no
  UI ever wrote it. Lucy could interview a nanny and confirm her CPR cert with nowhere to record
  it. Added a modal from the nanny row, plus Settings > Badges now actually persists to
  `config/badges` (it was dead chrome — an Add button with no handler).
- **Secret-leak closed before it happened.** `functions/.secret.local` holds live Stripe/Resend
  keys and was **not** gitignored.
- **David's DNS instructions were wrong.** Re-checked: the apex SPF record is **gone** (only
  Firebase's `hosting-site` TXT remains). The checklist told him to merge into a Fastmail SPF that
  no longer exists — probably dropped in the Wix→Firebase move. It's an **add**, not a merge, and
  his Fastmail mail has been sending unauthenticated since.

---

## The local lab (this is what makes the rest safe)

`npm run billing:local` runs the real billing engine against the emulator. **Verified end to end:**
`invoiced:1`, a **$27.00** `dryRun` invoice ($25 + 2 bookings) with the **PDF rendered** to the
storage emulator, the cycle advanced exactly 90 days, and both invoice emails resolved to the
parents and reached `status:sent` through the real pipeline — **with nothing leaving the machine.**
Re-running immediately gives `invoiced:0`, confirming the cycle-claim double-charge guard.

**⚠️ The finding that reordered the work: dry-run protects the CARD, not the INBOX.** `enqueueMail`
sits *outside* the `if (enabled)` block, so running the billing job with billing disabled still
queues a real `quarterly_invoice` mail doc per due family, which `onMailCreated` would send for
real. Hence the no-op mail transport had to land **first**.

That transport requires **both** `MAIL_TRANSPORT=noop` **and** `FUNCTIONS_EMULATOR`, because the
dangerous failure is the inverse of the feature — a stray flag in production silently killing every
email. `FUNCTIONS_EMULATOR` is set only by the emulator runtime, never by Cloud Run, so a leak is
inert. Pinned by its own test, verified by sabotage.

**Skipped the pubsub emulator deliberately.** The emulator does not run a cron — `onSchedule` only
registers a Pub/Sub topic, so triggering it locally means hand-publishing base64 envelopes to a
guessed topic name. Calling the extracted function directly is strictly better: you control `now`
(so cycle boundaries are testable) and `enabled`, and get `{invoiced, skipped}` back.

---

## Decisions

- **D66 — Test-first is a hard rule.** Three shipped bugs would have been caught by tests written
  *before* the fix; in all three the code looked correct and existing tests passed. Tests written
  after the fact assert what the code does, not what it should do. Watch it fail for the *right
  reason* — one agent correctly rejected its own first failing test because it failed on a missing
  export rather than an assertion.
- **D67 — The backfill starts a fresh 90-day cycle, never backdates.** The due query is `<=`, so
  today counts as due. Backdating would make families instantly due *and* backdate `cycleStart`,
  sweeping every historical booking into a surprise first invoice. Nobody is billed for anything
  predating the backfill. Delegates to `initialBillingCycle()` so it can never diverge from
  `savePaymentMethod`.
- **D68 — Local no-op mail transport is double-locked** (flag AND `FUNCTIONS_EMULATOR`), so it
  fails safe in the direction that matters.

---

## Current state

- **Green: 92 client / 64 functions / 23 rules = 179** (was 142). tsc clean, lint 0, both builds OK.
- **11 commits this session**, all on `landing-page-prelaunch`. **Still unpushed** (13 total ahead).
- **Nothing deployed. Nothing public.** Apex still serves the pre-launch landing page.
- Prod billing verified **safe**: `enabled:false` on every run, Stripe key is `sk_test_`.

## Next

1. **Stripe CLI** (`brew install stripe/stripe-cli/stripe`) → `stripe listen --forward-to` the local
   emulator to drive real *signed* webhook events. Its `whsec_` is its own — **never** paste it into
   prod.
2. Full three-role manual pass on the emulator (family → admin approval → nanny → booking).
3. Then Gate 2: push, deploy functions/rules, David's console tasks (Resend DNS, real webhook
   secret, first admin), E2E on `littlelamb-sb-app.web.app` with billing still dry-run.
4. **Before billing ever goes live:** run `backfill:billing --prod` (reports before it writes).

---

## Wave 3 (later the same session) — four parallel agents, three more bugs

Ran four agents on disjoint file sets. All four were killed mid-flight by the session limit, but
their work survived and was triaged file-by-file rather than committed blind. **Three more bugs of
the same "wiring exists but one end isn't connected" class:**

### The 5th dead notification call site
`assignNanny` bails before notifying unless passed `meta`, and its ONLY call site omitted it. A
nanny claimed an open booking, it flipped to `confirmed`, and the family got **no email and no
calendar invite** — the one path where the family doesn't already know a nanny is coming. So
`open_booking_picked_up` was 100% dead in production. The test file that should have caught it
mocked `assignNanny` and never asserted on it.

### Same-day bookings were a guaranteed dead end
Family books same-day → gets "we're checking" → lands on an admin banner **with no action
buttons** → never hears back. Per David, same-day is now a **job board post** any nanny can claim:
no admin matchmaking, families don't pick a nanny, Lucy emails nannies off-platform.

Implemented by normalising the stored status to `open` rather than widening the client query —
because `firestore.rules:166,192` hardcode `status in ['open','unmatched']`, so widening only the
client would have rendered a claimable post that Firestore then rejects.

### Recurring auto-cancel would have mass-cancelled pending requests
Found while verifying the cancellation logic David asked about. The job skipped only `cancelled`
bookings — but a **pending** recurring booking is pending *precisely because* it sits outside the
nanny's hours, so `isCovered` is false for it by construction. The moment recurring became
settable, every outstanding pending request entering the 48h window would have been auto-cancelled,
emailing both parties that the nanny's "availability changed" when nothing had. Now only
`confirmed` bookings can be auto-cancelled.

### Also landed
- **`webhook.ts`: 19 tests + a DI refactor.** It was the highest-risk untested module — money-
  terminal, and it returns 200 even on handler error, so a bug there loses the Stripe event
  permanently. Behavior deliberately unchanged; every test verified by mutation.
  **Found and documented, not fixed:** `markInvoice` silently no-ops when the invoice doc doesn't
  exist, so a webhook that beats `writeInvoice` **drops a paid status on the floor** and the
  invoice stays `pending` forever though Stripe took the money.
- **Calendly + policies config-driven.** The Calendly URL was a **live 404** shown at the single
  most important moment in the nanny funnel; it now hides when unset rather than rendering a dead
  link. Policies fall back per-field so a malformed config can never blank the page.
- **Two money bugs documented, NOT fixed** at David's instruction (`dad5277`) — see Backlog.md.

**Green: 132 client / 88 functions / 23 rules = 243** (was 179). 19 commits. Still nothing deployed.

### Not finished
`FamilyCalendarPage` never got its "Make this recurring" checkbox, so recurring is still
unreachable. The tested logic layer landed; the test-first draft for the UI is preserved at
`docs/wip/FamilyCalendarPage.recurring.test.tsx.draft` (kept out of the build — it fails to
typecheck precisely because the control doesn't exist, which is the failure it should have).


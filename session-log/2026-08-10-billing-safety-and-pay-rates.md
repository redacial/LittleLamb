# 2026-08-10 — Billing safety fixes + pay-rate matching

## Goal
Two things: (1) a new product decision — nannies and families each declare a pay range that
becomes real scheduling business logic; (2) a production-readiness audit run at the start of
the session surfaced launch blockers, the worst of which could **double-charge families**.
Since that code moves real money the moment Blaze is enabled, critical fixes went first.

## What was done (3 commits on `landing-page-prelaunch`)

### 1. `fix(billing): close double-charge risk + wire the missing invoice email` (d7f8d16)
- **`quarterlyCharge` could charge a family twice** — it advanced `nextChargeDate` *after*
  the Stripe call, so a timeout or retry mid-loop re-charged everyone already processed.
  Now: transactional cycle claim before charging (bails if another run moved the date),
  Stripe `idempotencyKey` from the pre-generated invoice id, and `maxInstances: 1` (D45).
- **Missing composite index** for `bookings(familyId, status, date)` — the query had no
  match and would have thrown on first real run (D46).
- **The invoice email was a bare comment** — families charged, never emailed. Added the
  `quarterly_invoice` event (client + functions copy, drift guard 11→12), template case,
  and family-only recipient routing (D47).
- **`stripeWebhook`** now dedupes by `event.id` via a `stripe_events` marker and returns
  200 on handler errors instead of 500 (D48).

### 2. `fix(reliability): error boundary + make failed admin reads visible` (1f0b67c)
- **No ErrorBoundary existed** — any render throw white-screened the app. Added one
  outside `AuthProvider`, using the shared `Button` (DESIGN_SYSTEM.md nominates
  `bg-ll-terra` but white-on-terra is 2.67:1; `Button` already resolves to terra-deep at
  4.64:1) (D49).
- **Admin hooks made an outage look like an empty queue** — the dashboard literally said
  "Nothing needs your attention right now" when the read failed. Hooks now return
  `{ items, error }`; new `LoadErrorNotice` replaces the empty state (D50).
- Added the repo's **first component test** (testing-library was installed but unused).

### 3. `feat: pay-rate ranges as scheduling business logic` (c5d7b4f)
Full vertical slice — there was no money concept in the domain model at all before this.
Types → pure logic → rules → wizards → profiles → directory → booking flow → seed → tests.
Design decisions in **D51/D52**; the three that matter: integer **cents**, **soft-downgrade**
on mismatch (not hard filter), and the agreed rate **snapshotted** onto the booking and made
immutable afterwards.

## Current state
- **Green:** client **58** tests (was 28), functions **34** (was 33), rules **19** (was 11).
  `tsc` clean, client build clean, functions lint + build clean.
- **Verified end-to-end against the emulator** with seed data straddling the family's
  $22–30 budget: Maya $25–35 → agreed $25–30; Sofia $18–22 → agreed exactly $22 (inclusive
  bounds); Grace $40–50 → no match, `pending`, still listed. The soft-downgrade path is
  exercisable from `npm run seed` with no data editing.
- **Still not deployed.** Everything remains Blaze-gated; only the landing page is live.

## Notes for next time
- A stray `npx prettier` run reformatted two files to a style the repo doesn't use (no
  prettier config exists here). It was reverted. **Don't run prettier on this repo.**
- The plan assumed a `quarterly_invoice` event already existed. It didn't — the union had
  no billing events at all, so one was added and the drift-guard count moved 11→12.

## Next steps
See `NEXT-SESSION.md`. Highest-value remaining work is **CI** (72+ green tests that nothing
enforces), **App Check keys** (empty in prod — the live waitlist has no bot protection),
and **backups/PITR**.

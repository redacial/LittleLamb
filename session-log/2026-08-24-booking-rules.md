# 2026-08-24 — One booking-rules module, and the two bugs hiding in the gaps

## Context

David walked the family flow and filed three findings as post-MVP (`a36e673`). On investigation
**F1 was not polish — it was two live correctness bugs**, so this sprint fixed F1 only. F2 (week
calendar) and F3 (toast) stay deferred, as he asked.

---

## The two bugs

### 1. A past date didn't just book — it auto-confirmed and emailed both parties
`resolveBookingStatus` tested `date === today` and **never `date < today`**. So a past date inside
the nanny's hours returned `confirmed`, and `createBooking` fired `booking_auto_confirmed` to the
family *and* the nanny — a confirmation for childcare that had already not happened.

**Four independent layers each failed to stop it:** the grid (every cell an unconditional
`<button>`; `today` drove only the styling pill), the status rule, the write path (`createBooking`
sanitized address and notes but never looked at `date`), and `firestore.rules` (role, ownership,
string lengths, rate — no date check at all).

It also fed `resolveRecurring`, which grants a weekly series only when status is `confirmed` — so
**a past-dated booking could seed a recurring series anchored in the past.**

### 2. `today` was computed in UTC
Five call sites used `new Date().toISOString().slice(0,10)`. Verified by simulation: at **6:30pm
Pacific the code's "today" is already tomorrow**, so a genuine same-day booking compared as future,
skipped `same_day_review`, and auto-confirmed — in exactly the evening hours Santa Barbara families
book childcare.

---

## What shipped

**`src/lib/bookingRules.ts`** — one module, 19 tests. `todayISO` (local, not UTC), `isPastDate`,
`hoursUntil`, `canBook`, `isLateCancel`, `isWithinAvailability`, and the three thresholds.

`canBook` is deliberately separate from `resolveBookingStatus`: a past date is not a *status*, it
is a refusal to create, and `BookingStatus` has no `'rejected'` member — widening that union would
ripple through every consumer. Mirrors the existing `RecurringRefusal` pattern.

**All three enforcement layers**, per David's call:
- **Grid** (courtesy) — past days disabled and visually muted; drag can't sweep through them.
- **`createBooking`** (correctness) — throws. The only client path that writes a booking.
- **`firestore.rules`** (the backstop) — the only layer a buggy or compromised client can't bypass.
  `date` is split into a timestamp and compared against `request.time`, accepting through the END
  of that calendar day so today stays bookable. UTC makes it lenient by up to a day, which is the
  right direction: it never rejects a legitimate booking, and precise same-day routing belongs in
  app code where the user's timezone is known.

**The 24h rules David defined** (neither existed before — not in code, not in the spec):
- *Minimum lead time* — a booking inside 24h no longer auto-confirms; it routes to the job board.
  Landed **inside `routeSameDay`** rather than beside it, because it is the same destination for
  the same reason: a wider window on routing that already existed (D66), not a new path.
- *Free-cancel window* — `isLateCancel` returns the **flag only**. Fees, strikes and escalation are
  a Lucy business decision and deliberately stay out of the module.

**Also:** consolidated the availability check in `FamilyCalendarPage`, where the same
weekday+block expression existed **twice** — submit path and live preview — so the two could
disagree about the very question the modal was previewing.

---

## Notes for next time

- **Every fix was verified by reintroducing the bug.** Restoring the UTC date, deleting the
  past-date guard, removing the rules clause, and dropping the shortNotice branch each fail
  immediately. The first `bookingRules` run failed on a *missing import*, which proves nothing —
  stubs were added so the 10 failures became real assertions.
- **A rot trap was fixed in the rules suite.** Existing booking fixtures hardcode `'2026-09-01'`,
  which silently becomes a PAST date once that day arrives and would then be rejected by the very
  rule added here. New fixtures use `isoOffsetDays()`, relative to the clock.
- ⚠️ **`functions/` cannot import `src/lib/`** (CommonJS/`rootDir` vs Vite; the deploy bundle is
  `functions/` only). Sharing is by manual file copy, and `src/lib/recurring.ts` vs
  `functions/src/shared/recurring.ts` **has already drifted** (124 vs 82 lines — benign, the
  functions copy is the generic subset). `bookingRules` is client-only today; if the 48h predicate
  is ever copied over, it must ship with a `readFileSync` drift test.

## Current state
**Green: 243 client / 95 functions / 28 rules = 366** (was 330). tsc clean, lint clean, build OK.
Nothing deployed this sprint — `firestore.rules` changed, so rules need a deploy before the guard
is live in prod.

## Still blocked on David (re-verified, unchanged)
Resend DNS absent (SPF **missing entirely** — an add, not a merge); `STRIPE_WEBHOOK_SECRET` still
`placeholder-not-a-real-key`. The card path remains untested anywhere.

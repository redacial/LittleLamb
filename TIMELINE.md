# Little Lamb Nannies — Timeline to a Fully-Made App

**Created:** 2026-08-04
**Target:** A real MVP that families can pay through — live emails, real Stripe billing, calendar
invites, all booking flows working end-to-end, on the real domain, security-hardened.
**Cadence:** Claude works mostly autonomously; David reviews, makes business calls (Lucy's open
items), and unblocks external accounts (Wix, Stripe, email provider).

---

## The honest starting point

What's **done** is more than it looks, and what's **left** is narrower than it looks — but the part
that's left is the hard part (money + real infrastructure).

| Layer | State |
|-------|-------|
| **Frontend** — 30 pages, all 3 roles, onboarding, dashboards, calendars, messaging, admin | ✅ **Built.** Wired to real Firestore. Premium Playful design system, WCAG AA passed. |
| **Security rules** — Firestore + Storage, per-collection, per-doc read authz | ✅ **Built & audited** (Phase 5). |
| **Pure business logic** — recurring-conflict detection, access rules, exporters | ✅ **Built & unit-tested** (26 tests green). |
| **Pre-launch landing + waitlist** | ✅ **Live** on prod + staging. |
| **Backend (Cloud Functions)** | ✍️ **Written, not deployed** (2026-08-04). `functions/` package built + unit-tested; deploy is Blaze-gated. |
| **Real payments (Stripe)** | ✍️ **Written, inert.** Real Elements card capture + billing engine; charges gated behind `config/billing.enabled` (default off) and Blaze. |
| **Real emails** | ✍️ **Written.** `deliver()` now enqueues a `mail` doc; `onMailCreated` sends via **Resend** (#13 resolved). Deploy-gated. |
| **Calendar invites (iCal)** | ✅ **Built.** Real `buildICalEvent` (#14 → iCal); attached to confirmation/cancellation emails. |
| **Custom domain + App Check live** | ⚠️ **Blocked/pending** — Wix account access; App Check keys. |

**Why this matters for the estimate:** every stub above was written as a clean seam — the DECISIONS
log confirms each is a "one-function change" to go live, and the call sites already pass correct
payloads. So the remaining work is *integration*, not *rewrite*. That's the single biggest reason
this timeline is measured in weeks, not months.

---

## Blocking dependencies (David + Lucy own these)

These gate specific phases. The sooner they land, the sooner that phase can start. **None block the
first phase**, so we start immediately and resolve these in parallel.

| # | Dependency | Blocks | Owner | Notes |
|---|-----------|--------|-------|-------|
| B1 | **Upgrade Firebase to Blaze plan** | Cloud Functions, all outbound calls (Stripe/email) | David | Pay-as-you-go; near-$0 at pilot scale. Required before *any* backend. |
| B2 | **Email provider account** (Resend recommended) | All automated emails | David + Lucy | Resend is simpler than SendGrid; needs a verified sender domain. |
| B3 | **Stripe account** | Billing, quarterly charges | David + Lucy | Business details + bank account for payouts. |
| B4 | **Wix/domain account access** | Custom domain go-live | David (ask partner) | From last session — original Wix account owns DNS. |
| B5 | **Lucy's open-item decisions** (badge list, cancellation policy, same-day flow, etc.) | Polish + a few flows | Lucy | ~12 items. Most are content/config, not code-blockers. Can trickle in. |

---

## The plan — 5 phases

Estimates are in **working-session weeks** at the "mostly autonomous, you check in" cadence. Ranges
reflect how fast the blocking dependencies land and how many of Lucy's decisions arrive on time.

### Phase A — Backend foundation + email (Week 1–2)
*Depends on: B1 (Blaze), B2 (email provider)*

- Stand up the `functions/` Cloud Functions project (TypeScript, same repo).
- Wire the **real email provider** into `notifications.ts` `deliver()` — turn on every already-defined
  event (approvals, booking confirmations, requests, rejections, message notifications).
- Move email sending server-side (Firestore-triggered functions) so the client never holds provider keys.
- Deploy the **scheduled function** that runs the already-written `findRecurringConflicts()` — 48h
  recurring auto-cancel + its emails go live.
- **Exit criteria:** a real signup approval sends a real email; a booking fires real confirmations.

### Phase B — Payments (Week 2–4)
*Depends on: B3 (Stripe). Overlaps the tail of Phase A.*

- Real Stripe card capture in the family setup wizard (Stripe Elements — stays out of PCI scope).
- Store customer + payment method against the family (server-side).
- **Quarterly billing engine:** scheduled function charges $25 + $1/confirmed-booking every 90 days
  from signup; generates the PDF invoice; emails it; stores it on the billing page.
- Failed-payment handling → the admin dashboard card + retry action become real.
- **Exit criteria:** a test family is charged the correct amount on a simulated cycle and gets a real
  invoice PDF. This is the "families can actually pay" milestone.

### Phase C — Calendar invites + booking-flow completion (Week 4–5)
*Depends on: B5 (a few Lucy decisions on booking/cancellation timing).*

- Generate real **iCal invites** on every booking confirmation, attached to the confirmation emails
  (Google/Apple/Outlook compatible), plus cancellation notices.
- Close the remaining booking-flow gaps end-to-end: same-day → admin routing, open-booking pickup,
  outside-hours requests — verified with real emails + invites flowing.
- Fold in Lucy's answers on cancellation policy + the same-day admin card design.
- **Exit criteria:** book → confirm → both parties get an email *and* a working calendar invite.

### Phase D — Hardening, E2E testing, real content (Week 5–6)
*Depends on: B5 (badge list, policies content).*

- End-to-end test pass across all three roles on staging with real integrations firing.
- Security re-audit of the new backend surface (functions auth, Stripe webhooks, rules for new writes).
- Firestore backups / PITR, monitoring + alerts, tighten CSP for the new external origins (Stripe).
- Replace remaining placeholder content: real badge list, policies text, founder bios (from Lucy).
- Clear the last dev-only npm advisories.
- **Exit criteria:** green E2E on staging, security sign-off, no placeholder content in critical paths.

### Phase E — Production launch (Week 6–7)
*Depends on: B4 (Wix/domain), App Check keys.*

- Custom domain `littlelambnannies.com` live (from last session's handoff) + SSL.
- Enable App Check (reCAPTCHA v3) on the real app, not just the landing.
- Deploy the app over the landing page; the waitlist converts to real signups.
- Smoke-test the full production stack; onboard the first real family + nanny.
- **Exit criteria:** a real Santa Barbara family completes signup → booking → payment on the live domain.

---

## Timeline at a glance

```
Week:        1     2     3     4     5     6     7
Phase A  [==========]                                   Backend + email
Phase B        [================]                       Payments (overlaps A tail)
Phase C                    [==========]                 Calendar invites + flows
Phase D                          [==========]           Hardening + E2E + content
Phase E                                [==========]      Production launch
```

- **Optimistic (all blockers land in week 1): ~5 weeks.**
- **Realistic (blockers trickle in, normal review cadence): ~6–7 weeks.**
- **If Lucy's decisions or external accounts lag: +1–2 weeks**, concentrated in Phases C–E.

The critical path runs through **payments** (Phase B) — it's the most involved integration and the
one that makes this "a real product." Everything after it is verification and go-live.

---

## What would make this go faster

1. **Land B1–B3 (Blaze, email, Stripe) in the first few days.** These are account signups, not code —
   pure calendar time we can remove by front-loading them.
2. **Get Lucy's ~12 open items answered early**, even roughly. Most are content; none need to be
   perfect on day one, but they unblock Phases C–D.
3. **Chase the Wix/domain access now** (Phase E's only blocker) so it isn't the thing that holds up
   an otherwise-finished app.

---

*This timeline assumes the current green baseline holds (tsc clean, 26 tests, builds OK) and that no
major scope is added mid-build. New feature requests during the build shift the end date accordingly.*

# Session Log

A running, chronological record of work sessions on Little Lamb — the decisions made, what
was built, and what's left. This is the human-readable memory of the project's evolution.

## Protocol

**At the START of every session:**
1. Read `CLAUDE.md`, `DECISIONS.md`, and `Backlog.md` (the existing project docs).
2. Read this `session-log/README.md`, then read the **most recent** dated entry in this folder
   (they sort newest-last by filename `YYYY-MM-DD-*.md`). That tells you exactly where the last
   session left off and what the immediate next steps are.
3. Run `git log --oneline -15` to confirm what's actually committed.

**At the END of every session:**
1. Add or update a dated entry file in this folder: `session-log/YYYY-MM-DD-<slug>.md`.
   If an entry for today already exists, append to it; otherwise create a new one.
2. Each entry should cover: **what was done**, **decisions made (and why)**, **current state**
   (what's live / green / broken), and **next steps** (the precise handoff for the next session).
3. Keep decisions and their rationale — future sessions rely on the "why," not just the "what."
4. If a decision changes an earlier one, note the change; don't silently overwrite history.

## Entries

- `2026-07-20-landing-page-and-firebase.md` — Standalone pre-launch waitlist landing page built,
  moved repo out of iCloud, two Firebase projects (prod + staging) created, landing deployed &
  verified live on both. Custom domain blocked on Wix account access.
- `2026-08-04-backend-around-blaze.md` — Wrote the entire Cloud Functions backend (email via Resend,
  real iCal invites, 48h recurring auto-cancel, Stripe billing) so it compiles + unit-tests green
  but is NOT deployed (Blaze-gated). Resolved open items #13 (Resend) + #14 (iCal). First rules unit
  tests added. 73 tests green across 3 suites. Nothing deployed — waits on Blaze.
- `2026-08-05-events-wired-messaging-removed.md` — Fired the 3 application notification events at
  their call sites (D43). Then, per a product veto, removed in-app messaging entirely (D44) — pages,
  hooks, routes, nav, types, rules, index, the new_message event + tests, dashboard cards. Left the
  nanny-cancellation channel as an open decision. Green: 28 + 33 + 11 tests.
- `2026-08-10-billing-safety-and-pay-rates.md` — Closed a **double-charge risk** in
  `quarterlyCharge` (no idempotency, cycle advanced after the Stripe call), added its missing
  composite index, and wired the invoice email that was a bare comment (D45–D48). Added the first
  ErrorBoundary and made failed admin reads distinguishable from empty queues (D49/D50). Shipped
  **pay-rate ranges** as scheduling business logic — cents, soft-downgrade on mismatch, snapshot on
  the booking (D51/D52). Green: 58 + 34 + 19 tests. Still nothing deployed — Blaze-gated.
- `2026-08-11-operational-hardening.md` — CI (first ever, D53), App Check enforced on
  callables (D54), per-user mail quota metered inside the claim transaction (D55), bundle
  work (D56 — landing first-paint **−51%**, from a dynamic Firebase import rather than the
  code splitting), and capped admin listeners that announce truncation (D58). Two plan
  assumptions proved wrong on inspection and were corrected rather than implemented (D57).
  Found root `npm run lint` broken (exit 127) — excluded from CI, tracked in Backlog.
  Green: 58 + 44 + 23 = 125 tests. CI has not yet run on a real runner.
- `2026-08-11-console-secrets-handoff.md` — **Console/account session** (David driving the
  consoles, launch-concierge guiding). Provisioned three of the account launch-blockers:
  Stripe **test** keys (`pk_test_` → `.env.production`, `sk_test_` → Secret Manager, verified),
  Resend API key (`re_` → Secret Manager, verified), App Check reCAPTCHA **v3** site key
  (`6L…` → `.env.production`). Only `.env.production` changed in the repo (two client-public
  keys). Doubles as the **engineering handoff** — exact code touchpoints, deploy sequence, and
  the webhook chicken-and-egg. **App Check caveat:** key was made in the Cloud console near the
  Enterprise/WAF flow — token acceptance must be verified on the metrics page at deploy. Still
  open: Wix DNS, Resend domain verification, live-key swap, Lucy's content.
- `2026-08-12-talk-to-lucy.md` — Prep for the 2026-08-12 Lucy meeting: get DNS/Wix access
  (P1 — the launch-slipping risk), collect her content (P2 — badges, policies, bios, badge
  colors), confirm open business decisions (P3). Exact questions to ask, and the one sentence
  to leave with.

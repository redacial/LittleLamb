# Next session plan

**Prereqs:** none for the code items. Start by reading `CLAUDE.md`, `DECISIONS.md` (esp.
D53–D58), `session-log/README.md` + the most recent dated entry, then `git log --oneline -12`.

**Branch:** continue on `landing-page-prelaunch`. Commit per section.

> **Do NOT run `npx prettier`** — no prettier config exists here; it reformats files to a
> style the codebase doesn't use.

---

## Context

As of 2026-08-11 the operational gaps are closed in code (D53–D58): CI exists, App Check is
enforced on callables, mail sends are metered, admin listeners are capped, and landing
first-paint JS is down 51%. Green: client 58 / functions 44 / rules 23 = **125**.

---

## 0. FIRST: confirm CI actually runs (5 minutes, do before anything else)

`.github/workflows/ci.yml` has **never executed on a GitHub runner**. Every step and every
red/green transition was verified locally, but runner-only differences can only surface on a
real run. Push the branch, open Actions, and watch it. Likely first-run issues:
- The Firestore emulator jar download / `actions/setup-java` on the rules job.
- `npm ci` against three separate lockfiles with a shared cache key.
- `npm ci --prefix firestore-tests` pulling `firebase-tools` (large, slow).

If the rules job proves flaky on CI, make it a separate non-blocking job — do **not** delete
it silently. Fix whatever breaks, then this item is done.

---

## 1. Code items, in priority order

### a. Fix the root lint setup (small, unblocks a real gate)
`npm run lint` is `eslint .` but the root project has **no eslint dependency and no config**,
so it exits 127 — which is why it is deliberately absent from CI (D53). Add `eslint` + a flat
`eslint.config.js` (model it on the working `functions/.eslintrc.cjs`), fix whatever it
flags, then add the step back to `ci.yml`. **All client code is currently lint-unchecked.**

### b. Real pagination for admin lists
D58 capped four listeners at 200 with a visible `truncated` notice, which bounds the damage
but doesn't let an admin *reach* older records. Add `startAfter` cursors + a "load more"
control, starting with `useAllBookings` (the most-used). The `AdminList` shape and the
`TruncatedNotice` component are already in place to build on.

### c. Landing bundle, round two
Now at 287,720 bytes first-paint. The remaining lever is **framer-motion at 122KB** — either
`LazyMotion` with a reduced feature set, or CSS animations for the landing page specifically.
React itself (133KB) is the floor without a framework change.

### d. Mail quota: consider an admin surface
`quota_exceeded` mail docs are logged and terminal but invisible in the UI. If a legitimate
user ever trips the cap, nobody finds out. A small admin view (or an entry in the existing
`billing_alerts` pattern) would close that loop.

---

## 2. Blocked on David — console tasks, not code

**These are now the highest-value items in the whole project, and neither takes long.**

- **Firestore backups / PITR.** Production holds real waitlist submissions with **no backup
  and no point-in-time recovery**. This has been deferred **five sessions running** and is
  the only outstanding item whose downside is permanent, unrecoverable data loss. Commands
  and steps are in `docs/app-check-runbook.md`. May require Blaze.
- **App Check reCAPTCHA v3 site key.** All enforcement code is wired and inert until a key
  exists; pasting it in makes it live with no further code changes. Same runbook.
- **Blaze upgrade** — gates all 7 functions, all email, all billing.
- **Wix DNS access** for `littlelambnannies.com` — owner unknown, possibly a former partner.
- **Real Resend + Stripe live keys**, then `firebase functions:secrets:set`.
- **Lucy's content** — badge master list, policies text, founder bios.

---

## 3. Open product decision
- **Nanny cancellation request channel.** D44 removed in-app messaging and the spec routed
  nanny cancellations through it, so there is currently **no in-app mechanism** for a nanny to
  request one. Handled off-platform until Lucy decides.

## 4. Known-deferred, documented
- `CLAUDE.md` still contains the obsolete messaging spec (Part 12, §4.8/4.9, admin §9, nav
  lists), left as historical per D44 — a future contributor could build removed features from
  it. Worth a "superseded" banner if it keeps causing confusion.
- Dev-only npm advisories and one upstream `uuid` inside `firebase-admin` (D42).
- No component tests beyond `ErrorBoundary`; hooks and pages remain untested.

# Next session plan — operational hardening (CI, App Check, backups)

**Prereqs:** none new for items 1–3. Start by reading `CLAUDE.md`, `DECISIONS.md` (esp.
D45–D52), `session-log/README.md` + the most recent dated entry, then `git log --oneline -12`.

**Branch:** continue on `landing-page-prelaunch`. Commit per section.

**Do NOT run `npx prettier`** on this repo — there is no prettier config and it reformats
files to a style the codebase doesn't use.

---

## Context — what's already done

The Cloud Functions backend is written and Blaze-gated. As of 2026-08-10 the money-safety
and white-screen risks are closed (D45–D50), and pay-rate matching shipped as a full slice
(D51/D52). Green: client **58** / functions **34** / rules **19**.

What remains is almost entirely **operational** — cheap to fix, but repeatedly deferred.

---

## The task — in priority order

### 1. CI (highest value, nothing else enforces any of this)
There is no `.github/` at all. 111 green tests across three suites run only when someone
remembers. Add a workflow that on PR + push runs: `npx tsc -b --noEmit`, `npm test`,
`npm run test:functions`, `npm run build`, and `cd functions && npm run lint && npm run build`.
`npm run test:rules` needs the emulator + Java — add it if the runner setup is
straightforward, otherwise leave it documented as local-only rather than silently skipped.
Note D37's drift-guard comment claims "drift fails CI" — that only becomes true here.

### 2. App Check keys — the live site currently has no bot protection
`VITE_FIREBASE_APPCHECK_SITE_KEY` is **empty in `.env.production` and `.env.staging`**, so
`initializeAppCheck` is a no-op and the public `waitlist` create surface is unprotected on a
live site today. `docs/security-audit.md` §14 claims App Check is wired — wired is not
enforced; correct that claim while fixing it. Needs a reCAPTCHA v3 site key from the
Firebase console (David).

### 3. Firestore backups / PITR
Production holds real waitlist submissions with no backup and no point-in-time recovery.
Deferred three sessions running. May require Blaze.

### 4. Rate limiting (do before functions deploy, not after)
No limits beyond Firebase Auth's built-in throttle. A signed-in user can enqueue unlimited
`mail` docs — once functions deploy that is an email-send amplification vector billed to the
project. Cheapest fix is a per-user write cap in the rules or a counter doc.

### 5. Pagination / query bounds
No `limit()` anywhere. `useAllBookings` live-listens to **every** booking on the platform
across four admin pages. Fine at 10 users, painful at 1,000. Also an N+1 nanny read in the
hourly `recurringAutoCancel`, and a 969 KB single JS chunk with no code splitting.

---

## Wrap up
- Update `session-log/` with a dated entry; refresh or delete this file.
- Full green: client 58+ / functions 34 / rules 19, all builds + functions lint clean.

## Blocked on someone else (cannot be fixed in code)
- **Blaze upgrade** (David) — gates all 7 functions, all email, all billing.
- **Wix DNS access** for `littlelambnannies.com` — owner unknown, possibly a former partner.
- **Real Resend + Stripe live keys**, then `firebase functions:secrets:set`.
- **Lucy's content** — badge master list, policies text, founder bios.

## Open product decision
- **Nanny cancellation request channel.** D44 removed in-app messaging, and the spec routed
  nanny cancellations through it — so there is currently **no in-app mechanism** for a nanny
  to request a cancellation. Handled off-platform until Lucy decides.

## Known-deferred, documented
- `CLAUDE.md` still contains the obsolete messaging spec (Part 12, §4.8/4.9, admin §9, nav
  lists), left as historical per D44. A future contributor could build removed features from
  it — worth a "superseded" banner if it keeps causing confusion.
- Dev-only npm advisories (vite/vitest/esbuild) and one upstream `uuid` inside
  `firebase-admin` — both correctly deferred, see D42.

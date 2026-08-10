# 2026-08-11 — Operational hardening: CI, App Check, mail quota, bundle, listener caps

## Goal
Close the operational gaps that had been deferred for several sessions. The code was in
decent shape; the *operations* around it were not — no CI, no bot protection, no rate
limits, no query bounds.

Work was run partly in parallel: three background agents on independent sections (App Check,
code splitting, the recurring job) while CI and the mail quota were done inline.

## What was done (3 commits on `landing-page-prelaunch`)

### `feat(ops): CI, App Check enforcement, mail quota, code splitting` (36b1241)
- **CI** — `.github/workflows/ci.yml`, two jobs (D53). Three `npm ci` runs because this is
  three independent npm projects; a separate job for rules tests because they start their
  own emulator and need Java.
- **App Check** (D54) — `enforceAppCheck: true` on both callables, prod warning when the key
  is missing, runbook written, `security-audit.md` §14 corrected from an inaccurate ✅.
  Deliberately NOT enforced on the waitlist rule.
- **Mail quota** (D55) — `createdBy` on mail docs (rule-pinned to `uid()`), metered inside
  the existing claim transaction, `quota_exceeded` terminal state, `mail_quota` server-only.
- **Bundles** (D56) — 18 routes lazied; the landing win came from a dynamic Firebase import.
- **recurringAutoCancel** (D57) — planned N+1 didn't exist; added a 4-day query horizon.

### `perf: bound the unbounded admin listeners, and say when a list is partial` (b9a505a)
Caps + a `truncated` flag surfaced in the UI, with a stronger warning on the two pages that
*count* rather than list (D58).

## Measured results
| Target | Before | After | Δ |
|---|---|---|---|
| Landing first-paint JS | 591,559 | **287,720** | **−51%** |
| App first-paint JS | 1,002,848 | 891,919 | −11% |
| Tests | 111 | **125** | +14 |

Landing is the only bundle real users load today.

## Two things the plan got wrong (both caught by verification, not assumption)
1. **The `recurringAutoCancel` N+1 did not exist.** `recurringCore.ts:64` already dedupes
   nanny reads with a `Set`; my audit read the callback and not its caller. No fake fix was
   applied — a cache there would have been dead code. The real issue (an unbounded hourly
   scan) was found and fixed instead.
2. **Code splitting alone did nothing for the landing page.** All its chunks load on first
   paint, so `manualChunks` only moved bytes between files. The 51% win came from a
   different change entirely (dynamic import).

Also found while wiring CI: **root `npm run lint` is broken** — `eslint .` with no eslint
dependency and no config, exit 127. It is excluded from CI and tracked in `Backlog.md`
rather than papered over. Client code is currently lint-unchecked.

## Current state
- **Green:** client 58 / functions 44 / rules 23 = **125**. tsc, both builds, functions lint
  all clean.
- **CI has never run on a real runner.** Every step and every red/green transition was
  verified locally (broken assertion → exit 1; type error → exit 2), but runner-only issues
  (emulator jar download, Java setup, npm cache across three lockfiles) can only surface on
  the first push. Noted in the workflow file itself.
- **Still not deployed.** Blaze-gated; only the landing page is live.

## Next steps
See `NEXT-SESSION.md`. The top item is no longer code: **App Check keys and Firestore
backups are both console tasks that only David can do**, and backups have now been deferred
five sessions running.

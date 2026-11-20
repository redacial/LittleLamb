# 2026-11-19 — CI back to green; domain 404 diagnosed (console step for David)

Branch: `landing-page-prelaunch`. Short session resuming the launch push. Two things: fixed a
red CI build, and diagnosed exactly why `littlelambnannies.com` still 404s.

## What was done

### 1. CI was RED — fixed (commit `fead06a`, pushed, confirmed green)
Last session's log said "CI is GREEN," but the two commits that landed *after* that note
(`e736668` fun-fact, `1bd8124` App Check) both pushed RED. Only the **Firestore rules-tests**
job failed; `build-and-test` stayed green.

**Root cause:** the `rules-tests` job had **no `TZ` pin**. The Pacific pin
(`TZ: America/Los_Angeles`) was added only to the `build-and-test` job in `b78932f`, and
**job-level `env` does not inherit across jobs**. So rules tests ran in **UTC**, where the
past-date backstop in `firestore.rules` (`bookingDateNotPast`, a `+1d+8h` window that assumes
the booking day was formed in Pacific) disagrees with `isoOffsetDays(-1)` in the test (which
builds "yesterday" off the runner's local calendar day) by 8h. The test
`rejects a booking dated yesterday` then flakes **by time of day**.

**Proven, not guessed:**
- `TZ=UTC npm run test:rules` → that one test FAILS (same file:line as CI, `:380/:381`).
- `TZ=America/Los_Angeles npm run test:rules` → whole suite green (66 passed / 4 skipped).
- Derived the arithmetic: in Pacific the rule rejects "yesterday" for **all** times of day
  (reject when `8h + H ≥ 8h`, always true), so the Pacific pin is genuinely always-safe — this
  isn't papering over a half-day flake, it's the correct fix.

**Fix:** added the same `TZ: America/Los_Angeles` env block to the `rules-tests` job, with a
comment explaining the non-inheritance. CI run `44645935396` = **success**.

### 2. Apex is LIVE; `www` redirect needs one DNS edit
My first probe got a 404 "Site Not Found", which I wrongly read as "domain not attached." A
console screenshot showed the opposite: on the `littlelamb-sb-staging-app` site,
**`littlelambnannies.com` = Custom, Connected**. Re-probed with cache-busting →
**HTTP 200, `<title>Little Lamb Nannies</title>`, `<div id="root">`**. The 404 was Firebase's
edge still propagating the just-flipped connection (and a cached 404). **The apex cutover is
DONE** — SSL valid, serving the app.

**Bare-`/` 404 aftershock (fixed by redeploy).** After the apex connected, the bare URL
`https://littlelambnannies.com/` kept returning a **404 "Site Not Found"** while EVERY other
path — `/login`, `/index.html`, even `/random-123`, and `/?anyquery` — returned 200, and the
origin `.web.app/` was 200. So the app was fine; Firebase's edge (Fastly) had **cached a 404
for the single key `/`** from before the domain connected, and that entry was stuck (`x-cache:
HIT`, not aging out despite `max-age=0`). **Fix:** `npm run build:app:staging` +
`firebase deploy --only hosting:app --project littlelamb-sb-staging` (new release `→` purges the
edge cache). Verified: bare `/` now 200 with the app HTML. Lesson recorded in Do-not-re-attempt.
Note the deploy CLI must be the authenticated `firestore-tests/node_modules/.bin/firebase` (no
global `firebase` on PATH; the npm `deploy:*` scripts call bare `firebase`).

The remaining item is **`www.littlelambnannies.com` = "Needs setup"** (set as Redirect →
apex). Diagnosed to a **single stale DNS record**:
- `www` `A` = `199.36.158.100` ✓ (already correct)
- `www` ownership `TXT` = **`hosting-site=littlelamb-sb`** ✗ — points at the OLD unused project,
  so Firebase can't verify `www` on the `-app` site and won't issue its cert (HTTPS to `www`
  currently fails cert validation; plain HTTP 301s, so Firebase is answering).

**The fix is to swap that one TXT** to match the apex: `hosting-site=littlelamb-sb-staging-app`.
No other `www` change needed (no `_acme-challenge` on `www` yet — Firebase adds/uses it after
verification).

Three Hosting sites exist: `littlelamb-sb-staging` (default), **`littlelamb-sb-staging-app`**
(the app — the live one), `littlelamb-sb-staging-landing` (abandoned). Everything points at
`-app`.

## Current state
- **CI:** GREEN on `landing-page-prelaunch` HEAD (`fead06a`).
- **App:** live at `https://littlelamb-sb-staging-app.web.app` AND at the real domain
  **`https://littlelambnannies.com` (HTTP 200 on bare `/` and all routes, serving the app, SSL
  valid)** after a hosting redeploy flushed the stuck edge-cached 404. 🎉
- **`www.littlelambnannies.com`:** "Needs setup" — one stale DNS TXT to swap (below).
- Redeployed the app to `littlelamb-sb-staging-app` this session (hosting only; same committed
  code, CI green). Tree clean, pushed.

## Next steps
1. **David — fix `www` (DNS, in Wix):** change the `www` host's TXT from
   `hosting-site=littlelamb-sb` to **`hosting-site=littlelamb-sb-staging-app`** (mirror the
   apex). Leave the `www` A record `199.36.158.100` as-is. Then click **re-verify** on the `www`
   row in Firebase Hosting; it'll verify and issue the cert (can take up to ~24h). The apex works
   regardless.
2. **Then me — re-verify:** `curl -I https://www.littlelambnannies.com/` returns a 301 to the
   apex with a valid cert.
3. Then resume the **launch-concierge** queue: prove a real Resend send (waitlist form → lands
   at hello@), prune the inert `savePaymentMethod` function + placeholder Stripe secrets, and
   the App-Check-enforcement / MFA decisions (both deferred, not blocking).

## Sticky-note redesign + legal-model realignment (D77) — started this session
After the domain went live, David asked to bring back the **D73 sticky-note design** as the app's
primary language (reverses D75), then attached the **Little Lamb LLC business plan**, which
reclassifies Little Lamb as a **California job-LISTING service, NOT an agency**. That turned the
re-skin into a copy + model realignment. David's calls: full model realignment; "sitters & nannies"
noun mix (keep `'nanny'` as the code identifier); fix pricing leaks + state the new model; make
sticky-note the system. Plan in `.claude/plans/recreate-the-plan-i-ve-agile-orbit.md` + **D77**.

Two audit subagents mapped the forbidden language + pricing/terminology wiring; a Plan subagent
designed the safe approval reversal (sitters self-activate like families; admin keeps
remove/deactivate — the business plan's own TOS lever; no data migration).

**Landed + committed:**
- **Phase 0** (`3eb21b8`): restored sticky-note Tailwind tokens + `.sticky-note`/`.sticky-tape` CSS
  + `<StickyNote>`/doodle primitives in `src/components/theme`; DESIGN_SYSTEM.md + D77.
- **Phase 1** (`c1fef91`): rewrote all user-facing copy to the listing-service model — removed
  vetting/agency/matching claims across public pages, profiles, cards, directory, onboarding;
  credentials → "self-reported, not verified by Little Lamb" (retired Background-Checked/Interviewed
  seed badges, added TrustLine); "unmatched/matching" → listing language (UI only, enum kept);
  scrubbed old "$25/quarter + $1/booking" + stated "first two bookings free, then $150/year"; new
  public **/terms** page (`src/lib/terms.ts`). Updated the tests a copy/badge change moved.
- **Phase 2** (`9670b84`, DEPLOYED): sticky-note re-skin of the marketing HomePage (paper, taped
  notes, brand bands) inside PublicShell with live CTAs + compliant copy; PublicShell re-skinned to
  paper. **Live on littlelambnannies.com** (HTTP 200, sticky-note CSS confirmed).
- Green throughout: 491 client tests, typecheck, lint, build.

- **Phase 3** (`5ce02e3`, DEPLOYED with rules): sitter self-activation. Test-first — inverted the
  approval rules block + `pendingUser()` helper, and the auth.test.ts create/Google tests (watched
  fail → pass). `selfApprovalOk()` now lets BOTH roles self-create approved+active (mixed states
  still rejected; admin deactivate lever + verifiedBadges immutability untouched); `initialApproval`
  returns approved+active regardless of role; NannyHoldingPage dropped the review/interview tracker
  (now a welcome into setup); DeclinedPage reframed to "removed/closed under Terms". homeRouteFor
  needed no change. **Deployed rules + hosting:app TOGETHER** (David approved) to
  littlelamb-sb-staging — they must be consistent or signup breaks. Apex 200 on the new build.
  Rules 66 / client 490 green, CI green.

**Still to do (next):**
- **Phase 4:** app shell + light-touch logged-in surfaces to paper (dense data UI stays readable).
- **Deferred (Phase 5/6):** remove admin agency tooling (VerifiedBadgesModal write path, the
  interview/stage controls in AdminPeoplePage, the Calendly card in AdminSettings); drop the
  `'verified'` BadgeType / migrate badge arrays; persisted ToS-acceptance checkbox.
- The abandoned `src/landing/*` still has the old vetting copy — not served, left as-is this pass.

## Do not re-attempt
- Don't add `TZ` only to one job and assume it covers the workflow — it does **not** inherit.
- Don't point any domain at `littlelamb-sb-staging` or `-landing`; everything is `-app`.
- Don't trust a single apex probe right after a Hosting change — the edge caches a 404 while the
  connection propagates. Cache-bust and re-check before concluding it's broken.
- If the bare `/` of a freshly-connected domain is stuck on a cached 404 while every other path
  is 200, don't wait it out — **redeploy hosting** (`build:app:staging` +
  `firebase deploy --only hosting:app --project littlelamb-sb-staging`), which rotates the
  release and flushes the edge cache. Clears in ~1 min.

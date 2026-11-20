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

### 2. `littlelambnannies.com` still returns 404 — diagnosed; needs David in the console
The apex now has a **valid SSL cert** (the ~24h issuance from last session completed:
`ssl_verify_result: 0`) and reaches Firebase Hosting — but returns Firebase's **"Site Not
Found"** page (`HTTP 404`, `x-served-by: cache-*`, `vary: x-fh-requested-host` — Hosting's
fingerprint). That page is exactly what Firebase serves when a hostname resolves to its IPs but
**no Hosting site has that custom domain attached**.

DNS is fully correct and live on all resolvers:
- apex `A` = `199.36.158.100` (Firebase) ✓
- apex ownership `TXT` = `hosting-site=littlelamb-sb-staging-app` ✓
- `www` also resolves to `199.36.158.100` ✓

So the gap is **not DNS** — it's that `littlelambnannies.com` is **not attached as a custom
domain on the `littlelamb-sb-staging-app` Hosting site** inside Firebase. The "Verify" David
clicked last session evidently did not complete the attachment (or it attached elsewhere and
isn't live). This is a **console task only David can finish** (tried to confirm via the Hosting
REST API with the CLI's token, but this `firebase-tools` build's internal `getAccessToken`
signature fought back; not worth more reverse-engineering for a step David must do anyway).

The project has **3 Hosting sites**: `littlelamb-sb-staging` (default),
`littlelamb-sb-staging-app` (**the app — the real one**), `littlelamb-sb-staging-landing`
(abandoned). The domain must land on **`-app`**.

## Current state
- **CI:** GREEN on `landing-page-prelaunch` HEAD (`fead06a`).
- **App:** live + working at `https://littlelamb-sb-staging-app.web.app` (HTTP 200).
- **Apex `littlelambnannies.com`:** SSL valid, but **404 "Site Not Found"** until the custom
  domain is attached to the `-app` site in the Firebase console.
- Tree clean, pushed.

## Next steps (David — console; then me)
1. **Attach the domain.** Firebase console → project `littlelamb-sb-staging` → **Hosting** →
   site **`littlelamb-sb-staging-app`** → **Add custom domain** → `littlelambnannies.com`.
   DNS is already in place, so verification should pass immediately; if Firebase shows A records,
   they already match (`199.36.158.100`). Re-check: `curl -I https://littlelambnannies.com/`
   should flip from 404 to 200.
2. **Add `www`** as a second custom domain on the same `-app` site, set to **redirect to the
   apex** (NOT apex→www — that direction broke it before).
3. Then resume the **launch-concierge** queue: prove a real Resend send (waitlist form → lands
   at hello@), prune the inert `savePaymentMethod` function + placeholder Stripe secrets, and
   the App-Check-enforcement / MFA decisions (both deferred, not blocking).

## Do not re-attempt
- Don't add `TZ` only to one job and assume it covers the workflow — it does **not** inherit.
- Don't point the domain at `littlelamb-sb-staging` or `-landing`; it must be `-app`.

# 2026-11-06 — Beta security pass: storage-rules fix, mandatory MFA, privacy policy, admin waitlist

Branch: `landing-page-prelaunch`. Goal for the session: get the app "clean + secure" for a beta
where **Lucy + real testers** enter real data. Decided to beta on **staging**
(`littlelamb-sb-staging`), keeping **prod (`littlelamb-sb`) pristine** for real launch.

## What was done (all committed, 459 tests green, typecheck + build clean)

1. **`fix(storage-rules)` (255c504)** — `callerUser()` did `firestore.get(users/{uid}).data`
   with no existence check, so a signed-in account with no user doc yet (created mid-signup)
   made `isApprovedMember()` THROW ("Null value error" at storage.rules L38, 5× in the rules-test
   log). Safe-failed to deny, but fragile. Guarded with `firestore.exists()`. Test-first:
   reproduced the 5 errors, drove to 0.

2. **`feat(auth)` mandatory TOTP MFA for ALL users (65b1d1a)** — families, nannies, admins.
   `RequireMfa` guard between RequireAuth and the role gates; flow is verify-email → enroll →
   through. `src/lib/mfa.ts` (enroll/challenge/email helpers, `needsMfaEnrollment` fails CLOSED),
   `src/lib/mfaGate.ts` (pure redirect decision), `/mfa/verify-email` + `/mfa/enroll` pages,
   TOTP challenge branch in LoginPage. Added `qrcode` dep (local QR render, secret never leaves
   browser; adds no prod-bundle advisories).

3. **`feat(privacy)` public privacy policy (310356c)** — `/privacy` (public), linked from footer
   + a signup consent line. Content in `src/lib/privacy.ts`, accurate to real data practices
   (Firebase/Stripe/Resend named). Inert plain text. **Draft, not legal advice — have it
   reviewed before public launch.**

4. **`feat(admin)` Waitlist page (dbc1e20)** — `/admin/waitlist` + nav entry. `useWaitlist()`
   lists landing-site signups + contact messages, newest first, All/Waitlist/Messages tabs,
   family/nanny pill, one-click mailto. No rules change (waitlist already admin-readable).

5. **`feat(auth)` MFA demo flag (526c1f7)** — `mfaRequired()` / `VITE_REQUIRE_MFA`. MFA enforced
   UNLESS the flag is literally `'false'`. Secure by default (a real build that omits it still
   enforces). Set `'false'` in `.env` (local/demo) only; absent from `.env.staging`/`.env.production`.

### Verified already-built (NOT re-implemented)
- **Waitlist → `hello@littlelambnannies.com`**: `functions/src/waitlist/onWaitlist.ts` already
  emails the team on every signup (ADMIN_EMAIL is already hello@). Delivery pending Resend verify.
- **Pre-approval wizard**: `/family/setup` + `/nanny/setup` already sit OUTSIDE the approval gate;
  both holding pages link to them with "progress saved." Works for both roles.

## Decisions made
- **D (beta target):** Beta on **staging**, not prod. Prod stays pristine for launch.
- **D (MFA scope):** TOTP required for **everyone**, not admins-only. David's call, confirmed
  twice over the lower-friction option. Max security for a platform holding children's addresses.
- **D (MFA wraps pre-approval wizard):** `RequireMfa` deliberately gates the WHOLE app including
  the voluntary head-start wizard — a pending user clears MFA first. David confirmed over the
  skip-until-approved option.
- **D (demo bypass):** MFA off for the local `npm run demo` via `VITE_REQUIRE_MFA=false`, secure
  by default everywhere else. NOT removed — the beta MFA stays intact.
- See also memory: `mfa-totp-required-all-users.md`.

## Current state
- Code: all green (459 tests, typecheck, build). On `landing-page-prelaunch`, committed, NOT pushed.
- **Staging is on SPARK** (confirmed in console). David **cannot upgrade to Blaze yet.**
- **The local demo is RUNNING** this session (`npm run demo`) on **http://localhost:5180/**,
  MFA off, seeded (accounts below). David is about to put Lucy's info into a local account and
  demo it without MFA. Demo data is throwaway (`.emulator-data`), emails only hit the emulator.
  Seed accounts (pw `lamb1234`): `admin@littlelamb.test`, `family@…`, `nanny@…`,
  `pending-family@…`, `pending-nanny@…`, `interview-nanny@…`.

## What "no Blaze" blocks (NOT the demo — the demo needs none of it)
- MFA on staging (Identity Platform is Blaze-only) — so the MFA code can't be *exercised* on
  staging until Blaze. Local demo is unaffected (flag off).
- Automated email delivery (Cloud Functions / Resend), PITR + backups, App Check enforcement.
- A persistent cloud account Lucy logs into from her own device.

## Next steps (precise handoff)
1. **Blaze upgrade on staging is the critical path.** David couldn't do it this session. Until
   then, staging beta is blocked; only the local demo works. Recommended: upgrade + set a budget
   alert (~$5/mo) right after. A **launch-concierge** agent has the full annotated console queue
   (Blaze → PITR+delete-protection → Identity Platform → TOTP+authorized domains → App Check key
   → Resend domain verify → monitor 24–48h then enforce → alerts). Each step has a plain-English
   "why." Re-launch launch-concierge to resume — it was mid-queue at Step 1 (Blaze check).
2. **Browser account gotcha:** the Firebase console errored "no access" because the browser was
   on the wrong Google account. The project IS accessible via `melesse.david11@gmail.com` (CLI
   confirmed). Use `/u/N/` in the console URL or switch accounts.
3. When David gets the **staging App Check reCAPTCHA v3 site key**, paste it into `.env.staging`
   line 13 (`VITE_FIREBASE_APPCHECK_SITE_KEY=`).
4. Docs/runbooks to lean on: `docs/app-check-runbook.md` (Parts 1–4), `docs/david-launch-checklist.md`,
   `docs/security-audit.md`. These are written prod-first; staging needs its own section once set up.
5. Nothing pushed — `git push` when ready. Consider whether this branch merges to main before beta.

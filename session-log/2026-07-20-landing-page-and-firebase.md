# 2026-07-20 — Pre-launch landing page + Firebase setup

## Goal
Get a landing page online, then continue with the app/backend/security/frontend, and finally
publish over the landing page. This session focused on the **landing page** end-to-end.

---

## What was done

### 1. Repo audit + fixes
- Audited the repo. Found the app is far along (full route tree for family/nanny/admin, all
  screens, onboarding, security-rules pass). `tsc -b` was clean.
- **Cleared a stale staged git revert.** `git status` showed alarming staged deletions (whole
  public site, design system). Verified the working tree exactly matched HEAD (commit `731e3a7`)
  and the index just held an uncommitted partial-revert. Fixed with `git reset` — nothing lost.
- **Moved the repo out of iCloud.** It lived in `~/Library/Mobile Documents/com~apple~CloudDocs/...`
  where macOS code-signing blocked native binaries (`vitest`/`vite build` failed with
  `ERR_DLOPEN_FAILED`). Cloned to **`~/Code/LittleLamb`**, copied gitignored files (`.env`,
  `.claude/settings.local.json`, `vendor/`), re-pointed the git remote to
  `github.com/redacial/LittleLamb`. In the new location the full baseline is green: `tsc` clean,
  **26/26 tests pass**, `vite build` succeeds. **→ All work now happens in `~/Code/LittleLamb`,
  not the iCloud path (that copy is stale).**

### 2. Standalone pre-launch WAITLIST landing site
Pivoted the landing page from "app entry" to a **pre-launch marketing + waitlist** site.
New code under `src/landing/`:
- `firebase.ts` — minimal init (app + Firestore + App Check only; no auth/storage).
- `waitlist.ts` — validates + sanitizes + writes each submission to a Firestore `waitlist`
  collection; 12s timeout so an unreachable backend surfaces an error instead of spinning.
  Contains the **`>>> EMAIL HOOK <<<`** marker for the future notification Cloud Function.
- `components/WaitlistModal.tsx` — the conversion modal: family/nanny toggle, waitlist + contact
  modes, success/error states, exposed via a `WaitlistProvider` context so any CTA can open it.
- `components/LandingShell.tsx` — nav/footer with **no login and no path into the app**.
- `pages/LandingPage.tsx` — single-scroll marketing page (hero, trust stats, how-it-works,
  families section, nanny preview, nannies section, closing CTA). Every CTA opens the waitlist.
- `landing.html` + `src/landing/main.tsx` — separate entry (no router, no AuthProvider).
- `vite.config.ts` — `BUILD_TARGET=landing` builds only the landing site to `dist-landing/`.
  The app bundle is fully excluded (grep-verified: no `RequireAuth`/`AdminDashboard`/router in it).
- npm scripts: `dev:landing`, `build:landing[:staging|:prod]`, `preview:landing`,
  `deploy:landing:staging`, `deploy:landing:prod`, `deploy:rules:staging`, `deploy:rules:prod`.

### 3. Firestore `waitlist` security rules
Added to `firestore.rules`: the `waitlist` collection is **public-create-only, admin-read-only**
— anyone (signed-out) can add one submission with a strictly validated shape (exact field set,
types, lengths, `status=='new'`, `createdAt==request.time`); nobody but admin can read/list/
update/delete, so the collection can't be enumerated to harvest signups. Compiled + deployed
cleanly to both projects (real validation).

### 4. Firebase projects (prod + staging)
- Account: personal **`melesse.david11@gmail.com`** (the `@westmont.edu` account's org blocked
  Firebase creation — 403; left one harmless empty GCP project `littlelamb-prod` under Westmont).
- Created **two** projects on the free Spark plan:
  - **`littlelamb-sb`** (prod) — live at **https://littlelamb-sb-landing.web.app**
  - **`littlelamb-sb-staging`** (staging) — live at **https://littlelamb-sb-staging-landing.web.app**
- For each: Firestore `(default)` DB (nam5, production mode), hosting site + target, registered
  web app, wrote `.env.staging` / `.env.production` with real config, deployed rules + landing.
- **Verified end-to-end on BOTH:** submitted a real waitlist entry through the live site and
  confirmed the document landed in Firestore with correct shape (name, email, role, server
  timestamp, status). No errors.
- `.firebaserc`: `default`/`prod` → `littlelamb-sb`, `staging` → `littlelamb-sb-staging`, with
  hosting targets mapped.

### 5. Custom domain (littlelambnannies.com) — STARTED, blocked
- Firebase "Add custom domain" for the root `littlelambnannies.com` generated the records.
- Discovered DNS is hosted at **Wix** (nameservers `ns12/ns13.wixdns.net`); WHOIS shows registrar
  Wix.com Ltd, registrant Little Lamb LLC, created 2026-04-13. Email routes to Fastmail
  (MX → messagingengine.com). The domain was likely registered via Fastmail's Wix-backed registrar.
- In the Fastmail admin account (`hello@littlelambnannies.com`) → Customize DNS, **added** the
  Firebase `A @ → 199.36.158.100` and `TXT @ → hosting-site=littlelamb-sb-landing`, **disabled**
  the root web A record (`103.168.172.37/.52`), kept ALL email records, and **saved**.
- **BLOCKED:** Fastmail is not authoritative (nameservers point to Wix) and has no nameserver
  control. Only the **original Wix account** (partner may have set it up) can change nameservers
  or edit authoritative DNS. The freshly-created Wix account is empty and can't see the domain.

---

## Key decisions (and why)
- **Firebase Hosting** over Vercel/Netlify — the whole app is already Firebase, so one security
  model for a business holding families' addresses + kids' info; free tier; scales.
- **Separate prod + staging** from day one — professional setup, test before prod.
- **Waitlist writes to Firestore now; email notification deferred** — the email Cloud Function
  needs the Little Lamb email + an email provider + the Blaze plan (still open items). Data is
  captured regardless, so nothing is lost by waiting. Hook marked in `waitlist.ts`.
- **Purely public landing** — no login/app access from the deployed site; app run locally while
  building.
- **Switch DNS to Fastmail** (vs. edit at Wix) was chosen, but blocked by Wix nameserver access.

---

## Current state
- **LIVE:** prod landing at https://littlelamb-sb-landing.web.app, staging at
  https://littlelamb-sb-staging-landing.web.app. Real waitlist submissions work end-to-end.
- **Green:** `tsc` clean, 26/26 tests, landing builds for both envs.
- **Not done:** custom domain (blocked on Wix access); app itself still in progress; email
  notification Cloud Function deferred.
- **Not yet committed to git:** all the new landing code + config changes are on disk in
  `~/Code/LittleLamb`, uncommitted at session end.

---

## Next steps (handoff)
1. **Commit the work** in `~/Code/LittleLamb` (landing site, rules, config, docs).
2. **Finish the custom domain** — needs the ORIGINAL Wix account (Little Lamb LLC, ~April 2026;
   ask partner). Then EITHER: in Wix DNS, replace the two A records (remove `103.168.172.37`/`.52`,
   add `199.36.158.100`) + add `TXT @ hosting-site=littlelamb-sb-landing` [lowest risk]; OR
   repoint nameservers Wix→Fastmail so the already-saved Fastmail zone goes live. Then click
   **Verify** in the Firebase Add-custom-domain dialog; SSL auto-provisions (up to ~24h). Consider
   adding `www` as a redirect to root.
3. **Before the domain goes public:** enable **App Check** (reCAPTCHA v3) for waitlist anti-spam;
   set `VITE_FIREBASE_APPCHECK_SITE_KEY` in the env files.
4. **Later:** wire the waitlist **email notification** Cloud Function (needs Blaze + email provider
   + the Little Lamb inbox — `hello@littlelambnannies.com` is a candidate). Hook in `waitlist.ts`.
5. **Then resume the main app** (backend/schema → security → frontend) per the original plan.

See `DEPLOY_LANDING.md` for the full deploy/setup guide.

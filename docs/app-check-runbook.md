# App Check Runbook — Little Lamb Nannies

**Audience:** David (console tasks). **Status as of 2026-08-10:** App Check code is wired on
both clients, and enforcement is turned on for the billing callables in code — but
`VITE_FIREBASE_APPCHECK_SITE_KEY` is **empty in `.env.production` and `.env.staging`**, so
`initializeAppCheck` never runs and no request carries an attestation token. Until you complete
Part 1 below, App Check protects nothing.

This runbook is the exact order of operations to turn it on **without taking the live site
down**, plus how to roll back. Part 4 covers Firestore backups/PITR, which is also a console
task and is overdue.

---

## What is enforced where (read this before flipping anything)

| Surface | Enforced? | Why |
|---|---|---|
| Callable functions `createSetupIntent`, `savePaymentMethod` | **Yes** — `enforceAppCheck: true` in `functions/src/billing/setupIntent.ts` | They move money and are not live yet. A bad key can only break an unreleased flow. |
| Firestore `waitlist` (public landing form) | **No** — deliberately | It is the only live conversion path on the pre-launch site. A missing/misconfigured key would silently take the form offline. Abuse control there is the strict shape rule + the server-side mail quota. |
| Firestore (everything else), Storage, Auth | **No** | Not enforced. Revisit after the app itself launches. |

**Rule of thumb:** never enable App Check *enforcement* in the Firebase console for a service
before you have watched its App Check metrics page show near-100% verified requests for at
least 24 hours of real traffic. Enforcement is a hard reject — unverified requests get a 401
with no user-visible explanation.

---

## Part 1 — Register reCAPTCHA v3 and get the site key

Do this for **each project separately**: `littlelamb-sb` (prod) and `littlelamb-sb-staging`.
They need different keys.

1. Firebase console → select the project → **Build → App Check**.
2. Open the **Apps** tab. You should see the registered Web app (the one whose App ID is in the
   matching `.env` file as `VITE_FIREBASE_APP_ID`). If it is not listed, register it.
3. Click the web app → choose **reCAPTCHA v3** as the provider.
   - Firebase offers to create the reCAPTCHA v3 key for you. Accept that — it auto-registers
     the secret on the Firebase side, which is the half you cannot paste anywhere.
   - If you create the key manually at <https://www.google.com/recaptcha/admin> instead, pick
     **reCAPTCHA v3** (not v2, not Enterprise — the client code uses `ReCaptchaV3Provider`),
     add the domains below, then paste the **secret key** into the Firebase console form.
4. Domains that must be on the reCAPTCHA key allowlist:
   - `littlelambnannies.com` and `www.littlelambnannies.com`
   - the Firebase Hosting domains (`littlelamb-sb.web.app`, `littlelamb-sb.firebaseapp.com`,
     and the staging equivalents)
   - `localhost` **only** on the staging key, never on prod.
5. Set the **token TTL**. Default (1 hour) is fine. Shorter = more reCAPTCHA calls.
6. Copy the reCAPTCHA v3 **site key** (the public one, starts with `6L…`). This is the value
   that goes in `.env`.

> The site key is public by design — it ships in the JS bundle. The *secret* key lives only in
> the Firebase console. Do not put the secret key in any `.env` file.

---

## Part 2 — Paste the key and rebuild

1. `.env.production` → `VITE_FIREBASE_APPCHECK_SITE_KEY=6L…` (prod key)
2. `.env.staging` → `VITE_FIREBASE_APPCHECK_SITE_KEY=6L…` (staging key)
3. Leave `.env` (local dev) **empty**. App Check is a deliberate no-op locally; both
   `src/lib/firebase.ts` and `src/landing/firebase.ts` skip init when the key is absent. In a
   production build with no key they now emit a `console.warn` instead of failing silently.
4. Deploy staging first and verify:
   ```
   npm run deploy:landing:staging
   ```
   Open the staging site, submit a test waitlist entry, and check the browser console:
   - **No** `[App Check] … is not set` warning → the key was picked up.
   - Network tab shows a request to `content-firebaseappcheck.googleapis.com` returning 200.
5. Then prod:
   ```
   npm run deploy:landing:prod
   ```
   Same two checks on the live site. Submit one real test entry and confirm it lands in the
   `waitlist` collection and the notification email arrives.

At this point tokens are being minted and attached, but nothing rejects requests without them.
That is the correct intermediate state — App Check is in "monitor" mode.

---

## Part 3 — Turn on enforcement, one service at a time

**Wait 24–48 hours after Part 2 before enforcing anything**, so the metrics page accumulates
real traffic.

1. Firebase console → **App Check → APIs** tab. Each row (Cloud Firestore, Cloud Functions,
   Cloud Storage, Authentication) shows a request breakdown: **Verified / Unverified /
   Outdated client**.
2. Enforce a service only when its **Verified** share is ~100% and Unverified is essentially
   zero. A nonzero unverified share means some real client is not sending tokens — find it
   first; enforcing will break exactly those users.
3. Recommended order for this project:
   - **Cloud Functions first.** The callables already declare `enforceAppCheck: true` in code,
     so the console toggle mostly makes it consistent. Low risk: the billing flow is not live.
   - **Cloud Storage next**, once the app itself launches and profile photo / video uploads are
     in real use.
   - **Cloud Firestore last, and cautiously.** Console-level Firestore enforcement applies to
     the whole database — including the public `waitlist` writes from signed-out visitors. Do
     not enable it while the pre-launch landing form is the primary conversion path.
   - **Authentication**: optional; enable only after the app launches.
4. After each flip, watch the metrics page and the site for 30 minutes. Submit a real form /
   run the real flow yourself.

### Enforcing on a *new* callable in code

Add `enforceAppCheck: true` to the options object alongside `region` / `secrets`:

```ts
export const myCallable = onCall(
  { region: REGION, enforceAppCheck: true },
  async (req) => { /* … */ },
)
```

Deploy with `npm run deploy:functions:prod`. Note this is a code-side gate independent of the
console toggle; both must be satisfied for a request to get through.

---

## Rollback (unenforce)

If the site starts rejecting legitimate users after a flip:

**Console-enforced service (fastest, ~1 min propagation):**
1. Firebase console → **App Check → APIs** tab → the affected service → **Unenforce**.
2. Confirm. Traffic resumes immediately; no deploy needed.

**Code-enforced callable:**
1. Remove `enforceAppCheck: true` from the options object in
   `functions/src/billing/setupIntent.ts` (or wherever it was added).
2. `npm --prefix functions run build && npm run deploy:functions:prod`.
   This is a full function deploy — budget a few minutes.

**Key itself is bad (wrong domain, wrong project):**
- Clearing `VITE_FIREBASE_APPCHECK_SITE_KEY` in the `.env` and redeploying the client puts you
  back to the current no-token state. Do this **only after** unenforcing every service, or
  every request will be rejected.

**Order matters on rollback: unenforce services first, then touch the key.**

---

## Part 4 — Firestore backups / PITR (separate console task, overdue)

Tracked as out-of-scope-for-code but still owed before launch. Two independent mechanisms:

### Point-in-time recovery (PITR)
- Firebase console → **Firestore → Backups** (or GCP console → Firestore → Point-in-time
  recovery). Enable PITR on the `(default)` database for `littlelamb-sb`.
- Gives 7 days of continuous recovery granularity (1-minute granularity for the last hour).
- **Requires the Blaze plan** and adds storage cost proportional to write volume. At current
  pre-launch volume this is pennies.

### Scheduled exports to GCS (the real disaster-recovery backstop)
1. Create a GCS bucket in the **same region** as the Firestore database, e.g.
   `gs://littlelamb-sb-firestore-backups`. Set a lifecycle rule to delete objects after 90 days
   so it does not grow forever.
2. Firebase console → **Firestore → Backups → Create backup schedule**: daily, retention 7–14
   days. This is the managed path and is the one to prefer.
3. If you need the manual/scriptable path instead:
   ```
   gcloud firestore backups schedules create \
     --database='(default)' \
     --recurrence=daily \
     --retention=14d \
     --project=littlelamb-sb
   ```
   Or a one-off export:
   ```
   gcloud firestore export gs://littlelamb-sb-firestore-backups/$(date +%Y-%m-%d) \
     --project=littlelamb-sb
   ```
4. **Also requires Blaze.** Exports are billed as document reads plus GCS storage.
5. Grant the Firestore service agent write access to the bucket if you created it manually
   (the managed backup schedule handles this itself).

### Verify the backup (do this once — an untested backup is not a backup)
- Export, then restore into a **scratch project or a non-default database**, never over the
  live one. `gcloud firestore import gs://…/<folder>`.
- Confirm `waitlist`, `users`, `families`, `nannies`, and `bookings` all came back.

Once done, update `docs/security-audit.md` §12 from ⏭️ to ✅ and strike the backups line from
the "Outstanding before launch" list.

---

## Quick reference

| Thing | Where |
|---|---|
| Client init (app) | `src/lib/firebase.ts` |
| Client init (landing) | `src/landing/firebase.ts` |
| Code-side enforcement | `functions/src/billing/setupIntent.ts` |
| Waitlist rule + why it is unenforced | `firestore.rules`, `match /waitlist/{entryId}` |
| Site key (prod / staging) | `.env.production` / `.env.staging` |
| Audit status | `docs/security-audit.md` §12, §14 |

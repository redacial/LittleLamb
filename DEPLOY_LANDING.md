# Deploying the Little Lamb landing page

This is the **pre-launch waitlist landing page** — a standalone marketing site with a
"Join the waitlist" + "Contact us" form. It is completely separate from the (still-in-progress)
app: the deployed site has **no login and no way into the app**.

Everything below is a one-time setup, then a single command to publish updates.

---

## What the landing page does

- Marketing page for families and nannies (Premium Playful design).
- **Join the waitlist** and **Contact us** forms. Each submission is saved to a private
  `waitlist` collection in your own Firebase project. Only an admin can read them.
- No email is sent yet — that's a later step (see "Email notifications" at the bottom).
  Submissions are captured safely in the meantime, so nothing is lost.

---

## Current state (as of 2026-07-20) — already set up and LIVE

Two Firebase projects exist on the personal Google account `melesse.david11@gmail.com`, both on
the free Spark plan:

| Env | Project ID | Landing URL (live) |
|-----|-----------|--------------------|
| **Production** | `littlelamb-sb` | https://littlelamb-sb-landing.web.app |
| **Staging** | `littlelamb-sb-staging` | https://littlelamb-sb-staging-landing.web.app |

Each has: a Firestore `(default)` database (nam5, production mode), a hosting site, a registered
web app, deployed `waitlist` security rules, and the landing page deployed. Real waitlist
submissions have been verified working end-to-end on both. Env config lives in `.env.production`
and `.env.staging` (gitignored; values are public client identifiers, not secrets).

`.firebaserc` aliases: `prod`/`default` → `littlelamb-sb`, `staging` → `littlelamb-sb-staging`.

To log in the CLI to this account: `npx firebase login` (use `melesse.david11@gmail.com`).

---

## Publishing updates

Deploy the landing page + rules to an environment with one command:
```
npm run deploy:landing:staging     # → https://littlelamb-sb-staging-landing.web.app
npm run deploy:landing:prod        # → https://littlelamb-sb-landing.web.app
```
Each builds the standalone landing site with the right env config and deploys **only** the
landing hosting target + Firestore rules. Test on staging first, then ship to prod.

Rules only (no rebuild): `npm run deploy:rules:staging` / `npm run deploy:rules:prod`.

---

## Connecting littlelambnannies.com (NOT done yet — needs Wix access)

The domain's DNS is hosted at **Wix** (nameservers `ns12/ns13.wixdns.net`; registrar Wix.com Ltd,
registrant Little Lamb LLC). Email routes to Fastmail (MX → messagingengine.com) — **do not
disturb the MX / DKIM / SPF / DMARC records or email breaks.**

Firebase's custom-domain records for the prod site (`littlelamb-sb-landing`):
- **Add** `A` @ littlelambnannies.com → `199.36.158.100`
- **Add** `TXT` @ littlelambnannies.com → `hosting-site=littlelamb-sb-landing`
- **Remove** the two existing web A records → `103.168.172.37` and `103.168.172.52`

**Blocker:** only the ORIGINAL Wix account (that registered the domain, ~April 2026 — a partner
may hold it) can change authoritative DNS or nameservers. A staged version of these edits was
already saved in the Fastmail DNS zone, but Fastmail isn't authoritative until nameservers point
to it. To finish, once you have the Wix login, EITHER:
- **(A, lowest risk)** In Wix's DNS records editor, make the three changes above directly; or
- **(B)** In Wix, repoint the nameservers to Fastmail so the already-saved Fastmail zone goes live.

Then open the Firebase Hosting → custom domain dialog and click **Verify**. SSL auto-provisions
(can take up to ~24h). Optionally add `www.littlelambnannies.com` as a redirect to the root.

**Before going public**, enable **App Check** (reCAPTCHA v3) for waitlist anti-spam and set
`VITE_FIREBASE_APPCHECK_SITE_KEY` in the env files.

---

## Checking who signed up

Waitlist and contact submissions land in **Firestore → `waitlist` collection**. Each entry has
name, email, phone, whether they're a family or nanny, and (for contact) their message. You can
read them in the Firebase console. Nobody but an admin can read this collection.

---

## Email notifications (later — currently deferred)

Right now submissions are only *saved*, not emailed to you. To get an email on each new signup,
we'll add a small Cloud Function once:
- you've chosen an email provider and given the Little Lamb email address, and
- the project is on the **Blaze** (pay-as-you-go) plan — Cloud Functions require it, but a
  waitlist's volume costs essentially nothing.

The place it plugs in is marked in `src/landing/waitlist.ts` (search for "EMAIL HOOK"). No data
is lost by waiting — every signup is already captured.

---

## Local preview (optional)

To see the landing page on your own machine before deploying:
```
npm run dev:landing          # live dev server, opens the page
# or, to preview the exact production build:
npm run build:landing && npm run preview:landing
```

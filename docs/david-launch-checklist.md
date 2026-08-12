# David's Launch Checklist — Little Lamb Nannies

_Last updated: 2026-08-11. The engineering is done and deployed. What's left is a short list of
account/console tasks only you can do. Work top to bottom — they're in dependency order._

> **Tip:** you can run any command shown here by typing `! <command>` in the Claude Code prompt,
> so the output lands in the conversation. Or invoke the **launch-concierge** agent
> ("what do I need to do next?") to be walked through these one at a time.

---

## ✅ Already done — you don't need to touch these
- All 7 Cloud Functions **deployed and verified serving** (`state: ACTIVE`) in `us-central1` —
  the webhook, callables, and both scheduled jobs all respond correctly.
- The **app is deployed** to https://littlelamb-sb-app.web.app (not on the public domain yet — it's
  the test surface). The apex `littlelambnannies.com` still shows the pre-launch landing page.
- **Domain is live with SSL**, DNS control is yours, Blaze + Firestore backups on.
- **Stripe test keys** in. **Resend API key** in. **App Check reCAPTCHA key** in.
- **Billing is safely OFF** — nobody can be charged until the very last step below.

---

## The remaining tasks

### 1. Resend domain verification — turns on all platform email · ~10 min + propagation
Email sending is off until this is done. The Resend account and key already exist; only the DNS
records are missing.

- [ ] In **Resend → Domains → littlelambnannies.com**, view the DNS records it wants.
- [ ] Add the **MX** and **DKIM** (`resend._domainkey`) records in your DNS editor.
- [ ] ⚠️ **The SPF record must be MERGED into your existing one — never add a second `v=spf1`
      record.** Your current SPF is `v=spf1 include:spf.messagingengine.com ?all`. If Resend asks
      for its own include, the merged value is something like
      `v=spf1 include:spf.messagingengine.com include:amazonses.com ?all`.
      **Send me the exact record Resend shows and I'll give you the precise merged string.**
- [ ] Leave Fastmail's MX/DKIM/SPF/DMARC records **in place** — don't delete them.
- [ ] Click **Verify** in Resend. Then tell me — I'll send a test email and confirm delivery.

_Unblocks: every automated email (approvals, booking confirmations, invoices, calendar invites)._

### 2. Stripe webhook — register the endpoint · ~5 min
The webhook function is deployed **and verified live** (an unsigned request returns "Missing
signature", so the endpoint is reachable). It just needs registering in Stripe and its secret.

- [ ] Stripe dashboard → **Test mode** → Developers → Webhooks → **Add endpoint**.
- [ ] Paste this exact URL:
      `https://us-central1-littlelamb-sb.cloudfunctions.net/stripeWebhook`
- [ ] Subscribe to **exactly two** events: `payment_intent.succeeded` and
      `payment_intent.payment_failed`.
- [ ] Copy the **Signing secret** (`whsec_…`) and run (this keeps the secret out of chat):
      ```
      firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project littlelamb-sb
      ```
- [ ] Tell me — I'll redeploy the webhook function so the new secret takes effect.

_Unblocks: payment confirmations reaching the app (marks invoices paid / flags failures)._

### 3. First admin account — one command · ~5 min
There's deliberately no in-app way to make someone an admin, so the first one is set up directly.

- [ ] Create the admin login first: sign up at https://littlelamb-sb-app.web.app **or** Firebase
      console → Authentication → Users → Add user. Note the email.
- [ ] Firebase console → Project settings → **Service accounts** → **Generate new private key**.
      Save the JSON file somewhere temporary.
- [ ] From the repo folder, run:
      ```
      export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json
      node scripts/make-admin.mjs admin@example.com "Lucy"
      ```
- [ ] **Delete the service-account key file** when done. The account now logs in to `/admin`.

_Unblocks: approving families/nannies, and the whole end-to-end test._

### 4. App Check — verify, then enforce · after the app has real traffic
The key is already live and the app is minting tokens. Before enforcing:

- [ ] Firebase console → **App Check → APIs** tab. Watch the **Verified / Unverified / Invalid**
      split over ~15 minutes of real use. **Verified should climb; Invalid should stay ~0.**
      If Invalid is significant, tell me — the key may not be bound and I'll fix it.
- [ ] Wait **24–48h**, then enforce **one service at a time**: Cloud Functions first, then Storage,
      then Firestore **last**. Don't enforce Firestore while the pre-launch landing form is still
      the main sign-up path. (Full detail: `docs/app-check-runbook.md` Part 3.)

_Unblocks: bot/abuse protection on the paid callables and uploads._

### 5. Stripe business verification → live payments — the go-live gate
- [ ] **Start Stripe business verification now** (dashboard → complete/activate your account). It
      can take **days** and is the most likely thing to delay launch — don't leave it for last.
- [ ] When we're ready to go live (test passed + Lucy's content in), I'll swap to live keys and
      register a live webhook. **You then flip billing ON** from the admin Settings page.
- [ ] ⚠️ **Until that final flip, checkout looks like it works but charges nobody.** This is
      intentional and safe — we keep it off until the very end.

_Unblocks: real charges. This is the last thing that happens._

### 6. Lucy's content — hand it over whenever ready
- [ ] Badge list (self-reported + admin-verified), policies text, founder bios, real nanny
      profiles/photos/videos. Send them to me — they're quick string swaps. **Badge list first**;
      nannies pick from it during onboarding.

_Blocks: showing the site to real families — not deploying._

---

## The launch sequence, at a glance
1. Resend DNS → email on
2. Stripe webhook → payment confirmations on
3. First admin → end-to-end test can run _(then I run the full three-role test)_
4. App Check verified → enforce after 24–48h
5. Lucy's content in + Stripe business verified
6. Swap to live keys → **you flip billing ON** → point the public domain at the app → **live** 🎉

**Nothing here is blocked on engineering.** The realistic gate is Stripe business verification and
Lucy's content — roughly **1–2 weeks**.

# 2026-11-16/17 — Launch push: staging-as-prod, auto-approval, free service, onboarding, App Check

Branch: `landing-page-prelaunch`. A long two-day session that turned the no-functions beta into a
real launch. The big framing decision: **the `littlelamb-sb-staging` Firebase project is now the
PRODUCTION backend** — not the pristine `littlelamb-sb` project. Reason: staging already had Blaze,
Cloud Functions, verified Resend email, and deployed rules; redoing all of that on a fresh project
would repeat hours of console/DNS work for no user-visible gain (users only ever see
`littlelambnannies.com`; the internal "staging" name is invisible). David confirmed this explicitly
after first asking for the real prod project.

## Decisions made (and why)
- **D (staging = prod):** Reuse `littlelamb-sb-staging` as the live backend. The real `littlelamb-sb`
  project goes unused. Cosmetic-only downside (project id says "staging"). David's call.
- **D (free launch, Stripe dropped):** Platform launches FREE. Stripe/billing is out of scope for
  launch, deferred to a later "switch to Stripe" phase. Billing was already gated off
  (`VITE_BILLING_LIVE` unset → `stripeEnabled` false), so this was a UI-honesty change, not a code rip-out.
- **D (families auto-approved; nannies NOT):** Families go live the moment they sign up — no admin
  step. Nannies STILL require admin approval (they're the trust surface parents rely on). This is a
  security invariant enforced in rules, not just client code.
- **D (one app, not split):** `littlelambnannies.com` serves the APP (which already has a marketing
  homepage at `/` via IndexRedirect→HomePage, with in-app Log in→/login→dashboard). The separate
  `src/landing/` build is REDUNDANT and abandoned for the domain. (Earlier this session I mistakenly
  wired the standalone landing's CTAs to the app and deployed it — then reverted that commit, 047695b,
  once David clarified he wanted one unified app. Don't rebuild the standalone landing.)
- **D (MFA off for beta):** Launch without MFA/TOTP to avoid the Identity Platform console friction.
  `VITE_REQUIRE_MFA=false` in `.env.staging`. Revisit post-beta.
- **D (App Check = reCAPTCHA Enterprise):** Google migrated reCAPTCHA into "Fraud Defense"
  (Enterprise). We used an Enterprise score-based web key, so the client uses
  `ReCaptchaEnterpriseProvider` (NOT v3). Running in MONITORING mode — NOT enforced.

## What was built (all committed + pushed; test-first throughout)
- `b78932f` **fix(ci):** TZ pin (America/Los_Angeles) so bookingRules tests pass on UTC runners +
  bump functions runtime to Node 22 (Node 20 was decommissioned 2026-10-30, blocking deploys).
- `0dd01f7` **fix(ci):** rules-tests PostCSS `css.postcss:{plugins:[]}` so Vite stops walking up to
  the root tailwind config (CI runs `npm ci --prefix firestore-tests` only → no root tailwind).
  → **CI is GREEN for the first time in weeks.**
- `7734e59` **feat(billing):** honest free-service UI when billing off — wizard payment step → "free"
  confirmation, Billing nav tab hidden for families, FamilyBillingPage shows free panel on direct URL.
  All behind existing `stripeEnabled` flag (reverses by flipping `VITE_BILLING_LIVE=true`).
- `9870b7b` **feat(auth):** family auto-approval. `initialApproval(role)` in src/lib/auth.ts (family→
  approved:true/approved; nanny→false/pending/application_received), used by both createAccount AND
  signInWithGoogle. firestore.rules `selfApprovalOk()` validates approval state PER ROLE on users
  create (family may self-approve, nanny may NOT — 3 rejection tests). homeRouteFor already routes an
  approved family to the wizard→dashboard (no change).
- `e277429` + `047695b` **landing CTA conversion, then REVERTED** (abandoned the split-site approach).
- `1658b7a` **feat(onboarding):** Care.com-style selection-first nanny onboarding. New
  `src/lib/nannyProfileOptions.ts` catalogs (experience bands, specialties, activities, approaches,
  languages, interests, fun-fact prompts), `src/components/onboarding/ChipGroup.tsx` tap-chip
  primitive. Wizard step 0 = photo (required) + experience-band chips + OPTIONAL bio + fun-fact
  prompt-picker + interest chips; step 2 adds 4 "about you" chip groups. Mirrored on profile-edit +
  public profile/card. NannyProfile gained optional experienceBand/specialties/activities/approaches/
  languages/funFactPrompt/interests (back-compat). firestore.rules `arrMax()` + `nannyAboutMeOk()`
  cap the new arrays (≤30) and id strings (≤40).
- `e736668` **feat(nanny):** fun-fact shows the full composed line (prompt lead + answer) via
  `composeFunFact()`, graceful for legacy/partial data.
- `1bd8124` **feat(app-check):** switch to `ReCaptchaEnterpriseProvider` in both firebase init files.

## Current state — what's LIVE on littlelamb-sb-staging (= prod backend)
- **App:** https://littlelamb-sb-staging-app.web.app — family auto-approval, free billing UI, email
  live, one-app marketing→login flow, Care.com-style nanny onboarding. App Check active (monitoring).
- **Functions:** onMailCreated, onWaitlistCreated, recurringAutoCancel deployed on Node 22. (The 5
  Stripe/billing functions were NOT deployed — free launch. `savePaymentMethod` is an inert leftover
  from an early partial deploy; prune later.)
- **Email:** LIVE. Resend domain littlelambnannies.com fully verified; real `RESEND_API_KEY` in Secret
  Manager; sends from `Little Lamb Nannies <hello@littlelambnannies.com>`. ⚠️ **NOT yet proven with a
  real send** — every test attempt hit a non-email path (family signup→setup, not the waitlist form).
  Next session: do a real waitlist-form send and confirm it lands at hello@ (inbox+spam).
- **Rules:** latest deployed (family auto-approval + nanny about-me caps).
- **Firestore:** PITR + delete protection ON.
- **App Check:** reCAPTCHA Enterprise key `6Ld2rCUuAAAAAJsJ...` registered + in `.env.staging`,
  MONITORING mode. NOT enforced. Verify in browser: no "[App Check] not set" warning, 200 from
  content-firebaseappcheck.googleapis.com. Enforce only after APIs tab shows ~100% verified (order:
  Functions, Storage, Firestore last; the runbook warns against Firestore enforcement while a public
  form is a conversion path).
- **CI:** green (client + functions + rules) on current HEAD.
- Tests: **488 client / 95 functions / 66 rules** green.

## 🚧 DOMAIN CUTOVER — IN PROGRESS (the one unfinished thread)
`littlelambnannies.com` is being pointed at the staging APP site. Done so far:
- Removed the domain from the landing site; added it to `littlelamb-sb-staging-app` serving the BARE
  apex (not a redirect-to-www). Ownership TXT swapped in Wix to `hosting-site=littlelamb-sb-staging-app`
  — verified live on all resolvers.
- David clicked **Verify** in Firebase; it was still verifying (background) at session end.

**Next session — finish the domain:**
1. Reopen Hosting → `littlelamb-sb-staging-app` → the domain. Once verified, Firebase shows A records.
   Paste them; the apex A is already `199.36.158.100` so it may already match.
2. Add `www.littlelambnannies.com` as a 2nd custom domain, set to **redirect to the apex** (NOT the
   reverse — the apex→www redirect is what broke it earlier). The stale `www` TXT (`hosting-site=
   littlelamb-sb`) and old `_acme-challenge` TXT may need swapping/removing — only if Firebase asks.
3. DNS to NOT touch: apex SPF (`v=spf1 include:spf.messagingengine.com include:amazonses.com ?all`),
   Resend (`resend._domainkey`, `send` MX/TXT), Fastmail MX, fm1/fm2/fm3 DKIM CNAMEs, DMARC.
4. SSL cert issuance can take ~24h; the app keeps working at its .web.app URL meanwhile.

The **launch-concierge** agent has the full annotated console/DNS queue and did all the dig-verifies
this session. Re-launch it to resume the domain step.

## Still open / deferred (not blocking)
- **MFA/TOTP:** OFF for beta. Identity Platform is enabled on the project, but TOTP must be turned on
  in the Google Cloud Identity Platform console (Firebase console only shows SMS). Then flip
  `VITE_REQUIRE_MFA` on + redeploy.
- **App Check enforcement:** after 24–48h monitoring.
- **Prove email with a real send** (above).
- **Prune the inert `savePaymentMethod` function** + placeholder Stripe secrets.
- Lucy's content (badges, policies, founder bios, real nanny photos/videos).
- **⚠️ Key hygiene:** the Resend API key was pasted in chat this session — David should rotate it
  (delete in Resend, create fresh, re-set the secret without pasting).

## Do not re-attempt
- Don't rebuild the standalone `src/landing/` CTAs for the launch — the app's own HomePage at `/` is
  the real marketing page. The separate landing build is abandoned for the domain.
- Don't use reCAPTCHA v3 for App Check — the key is Enterprise; provider is already `ReCaptchaEnterpriseProvider`.

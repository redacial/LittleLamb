# 2026-10-02 — Pushed the backlog of commits; catch-up on launch readiness

Short session. David asked for a state-of-the-app catch-up and a push.

## What was done

- **Pushed the 10 unpushed commits** on `landing-page-prelaunch`
  (`913da4a..3ad2b94` → `origin/landing-page-prelaunch`). The branch had been sitting 10 ahead of
  its upstream — the NEXT-SESSION handoff flagged this as the first thing to do, and more of the
  2026-09 redesign work had landed on top since. Tree is clean.
- **CI:** `.github/workflows/ci.yml` exists and should have triggered on the push. Could **not**
  confirm green from here — `gh` is not installed on this machine. David to watch
  https://github.com/redacial/LittleLamb/actions (or `brew install gh` and I can poll it).

## Current state

- **Branch now level with upstream** (0 ahead) after the push; still **106 ahead of `main`**.
- **Nothing deployed, nothing public.** Apex still serves the pre-launch landing page; the app is
  unpromoted at `littlelamb-sb-app.web.app`. Prod billing still SAFE (`enabled:false`), Stripe key
  still `sk_test_`, `STRIPE_WEBHOOK_SECRET` still placeholder, Resend DNS still absent.
- **Feature-complete through the 2026-09 redesign** (all six workstreams committed: 25h window +
  job-board routing, single-value rates, kids-by-birthday, pets Y/N, primary+emergency contacts,
  age badges). Tests were green at the last run per prior handoff (~355 client / 95 functions /
  49–55 rules); **not re-run this session.**

## Launch-readiness summary (given to David)

Engineering to a billing-OFF public launch is ~1–1.5 focused days: finish the recurring checkbox
(~30m), Stripe CLI webhook pass (~1h), three-role emulator pass (~1.5h), Gate 2 first deploy (~2h).
Then David's console tasks (Resend DNS, Stripe test-mode webhook + secret, first admin). Live card
payments remain deferred post-launch (blocked on EIN) — platform launches billing-OFF by design.
Real long pole is **Lucy's content** (nanny photos/videos, bios); badges + policies are
admin-editable already. David's own TOP backlog item (BK-1..5 booking-UX overhaul + ONB-1
TurboTax onboarding) is a **post-launch** design track, not a launch blocker.

## Next steps

Unchanged from `NEXT-SESSION.md` except step 1 is now done:
1. ~~Push the commits~~ ✅ done this session. **Confirm CI green** (needs `gh` or the Actions page).
2. Finish the recurring checkbox (`docs/wip/FamilyCalendarPage.recurring.test.tsx.draft` → real test,
   watch it fail, add the control, watch it pass).
3. Stripe CLI local webhook pass, then full three-role emulator pass.
4. Gate 2 — first deploy (app stays OFF the public domain), read the rules diff line-by-line.

# 2026-08-24 — The four dead ends only a real applicant would have hit

## Context

David asked what stands between here and launch, assuming **Resend DNS and the Stripe webhook
stay blocked for a couple more cycles**. So the sprint goal became: make the app **demo-able to a
real family with no email at all**.

A launch-readiness audit found the plumbing healthier than expected — wizards persist, Storage
rules match the upload lib, guards are coherent, and card capture does **not** depend on the
blocked webhook. What was left was concentrated in four **human-facing dead ends**, and every one
of them got *worse* precisely because email is dark.

---

## The four

### 1. A declined applicant was trapped in a lie
`homeRouteFor` branched only on `approved` — and a rejected account is *also* `approved: false`.
So a family Lucy declined landed on the pending holding page reading *"We'll email you the moment
you're approved."* Forever. The rejection email meant to correct it cannot send. They would keep
checking back, then call to ask why it was taking so long.

Now routed to a real declined page that states the decision and offers a human to reach. It
deliberately does **not** offer "Complete your profile" — inviting someone into a wizard they can
never finish is the same failure in a different costume. Deactivated is worded separately from
declined; saying the wrong one is its own small insult.

### 2. Approval was invisible — the fix that makes a pre-email demo work
`AuthContext` keeps a **live `onSnapshot`**, so `approved` flips the instant Lucy clicks Approve.
But neither holding page read it. The family sat on "we're reviewing your application" and the
page never changed; they had to independently guess to log out and back in, and **nothing told
them to**. The data was already arriving — nothing consumed it. Both pages now switch to an
approved state with the way forward.

### 3. Rejecting was one irreversible click
Approve and Reject were adjacent `size="sm"` buttons, no confirmation anywhere in the app, and
both only rendered while `status === 'pending'` — so rejection had **no undo**. Reject now
confirms and *names the person* (a confirm that doesn't say who is nearly useless against a
misclick) and warns they won't be notified. Approve stays frictionless: approving by mistake is
undone in seconds; rejecting was permanent.

`reinstate()` restores `pending`, **not** `approved` — a true undo to the exact prior state, so a
recovery click can never push someone Lucy deliberately declined into the live directory. It
fires no notification, because "you're approved" would be a lie when they're merely back in the
queue.

### 4. The application answers were thrown away
`/apply` collected neighbourhood, children, notes, experience and a personal statement — and wrote
them to `sessionStorage` under a key **nothing in `src/` ever read**. They died with the tab. So
the user re-typed everything, and **Lucy approved families seeing only a name and an email**.
"We personally review every family" had no data behind it on screen.

Now persisted to `users/{uid}`, sanitized at the write boundary in `createAccount` (which guards
every caller including Google signup), and rendered in the admin row alongside the phone — which
was always stored and never shown.

---

## Two things worth carrying forward

**A rules bug caught by the clock.** The past-date rule shipped last sprint used a `+1d` window.
The suite failed at **7pm Pacific**: `request.time` is UTC, so UTC was already tomorrow and the
rule rejected the user's own *today* — the exact same-day booking the platform supports, in the
evening hours families actually book. Widened to `+2d` to absorb the offset in either direction.
The rule is deliberately loose; the precise boundary is `canBook()`'s job in app code where the
timezone is known. The old comment claiming it was "lenient by up to a day" was wrong in this
direction and is corrected.

**A false green, avoided.** One agent's first sabotage attempt silently didn't apply (whitespace
mismatch) and reported a clean pass. Every mutation check now asserts the file actually changed
before the result is trusted.

**A pre-existing hole closed en route.** The users self-update rule had *no* length guards at all,
so the new application-field caps were trivially bypassed by creating a valid doc and editing it
immediately. `applicationFieldsOk()` is applied to both create and update.

---

## Proof — the sprint's actual claim, verified locally with email off

| Check | Result |
|---|---|
| New applicant sees the review page | ✅ |
| The answers persisted (were previously discarded) | ✅ |
| Phone stored **and now rendered** | ✅ |
| Approval lands on the doc `AuthContext` watches | ✅ |
| Approved family routed onward — **no re-login** | ✅ |
| Onboarded family reaches the dashboard | ✅ |
| Declined family sees the declined page | ✅ |
| …and **not** the "we'll email you" page | ✅ |
| Reinstate returns them to pending, not approved | ✅ |
| **Mail docs queued during the whole run** | **0** |

## Current state
**Green: 287 client / 95 functions / 37 rules = 419** (was 366). tsc clean, lint clean. Six
commits. Rules deployed to prod; the app remains unpromoted and the apex still serves the landing
page.

## Next
- Modal focus trap + visible ✕ (WCAG, affects every modal); `ReviewModal.save()` has no `catch`.
- Storage reads are `isSignedIn()` not `isApprovedMember()` — anyone who signs up, including
  someone rejected, can read every family photo and intro video by URL.
- Intro video: 60 MB cap is below a 1-minute modern phone video, on a *required* step.
- Still deferred: F2 week calendar, F3 toast.

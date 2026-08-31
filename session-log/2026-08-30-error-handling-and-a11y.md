# 2026-08-30 — The silent-failure sweep, plus a clock bug the suite caught

## Context

Picked up a large **uncommitted** sprint the previous session had left in the working tree —
never committed, never logged. It was coherent, high-quality work mapping exactly onto the "Next"
list from `2026-08-24-human-dead-ends.md`: error-handling and accessibility hardening across the
human-facing screens. This session's job was to verify it, fix what was actually broken, and land
it clean.

The tree also held a stray `src/pages/family/__probe.test.tsx` — a leftover debug probe that
asserted `expect(true).toBe(true)`. Removed before committing anything.

---

## What landed (four commits)

### 1. `fix(rules)` — the past-date backstop accepted *yesterday* late in the UTC day
**This was a real, failing test**, not inherited work — the rules suite was red when I arrived.
`bookingDateNotPast()` used a `+2d` window (widened last sprint to stop rejecting the user's own
*today* at 7pm Pacific). `timestamp.date(D)` lands at UTC midnight, so near the end of any UTC day,
`yesterday + 2d` still exceeded `request.time` and a booking dated yesterday was accepted. The test
"rejects a booking dated yesterday" proved it at 16:43 PDT (23:43 UTC).

Fix: **anchor to Pacific** rather than guess symmetric slop. Little Lamb is Santa Barbara — Pacific
only. A local day D ends at `D+1 00:00 Pacific = D+1 08:00 UTC` (PST; PDT is 07:00, one harmless
extra hour). Accept while `request.time < timestamp.date(D) + 1 day + 8 hours`. This rejects any
genuine yesterday *and* never rejects a legitimate Pacific today, **robust across the entire
Pacific day** — not just away from the UTC boundary, which is where `+1d` and `+2d` each broke in
opposite directions. Still the loose backstop; `isPastDate()` in `bookingRules.ts` stays the
precise rule where the user's timezone is known.

### 2. `fix(storage)` — photo/video reads were `isSignedIn()`, i.e. anyone
profile-photos and intro-videos were readable by **any signed-in account** — a rejected applicant
or a just-signed-up bot could pull every family photo and nanny intro video by URL. Firestore
already scoped the profile *data* to approved members; this closes the same door on the file side.
Now **owner OR approved member** (one cached `firestore.get` on `users/{uid}`, mirroring
`isApprovedMember()`). The owner half is load-bearing: the wizard is reachable pre-approval, so an
applicant must read back their own just-uploaded preview before Lucy approves them. Also widened
`isVideo()` to any `video/*` — the client gates on `video/`, so the narrower allowlist only made
Android `video/3gpp`/Matroska captures pass every client check then die on an opaque rules
rejection; the 60 MB cap is the real bound. New `firestore-tests/storage.rules.test.ts` pins it.

### 3. `fix(a11y)` — modal focus trap + visible close, and colour-independent booking status
`Modal` set `aria-modal="true"` while keeping none of the promise — no focus trap, no restoration,
no autofocus, no visible close (only a full-screen backdrop button announced *before* the content).
Now: focus enters the panel on open and returns to the trigger on close, Tab/Shift+Tab cycle inside,
Escape dismisses, backdrop is inert to AT, and a real 44px ✕ lives in the panel. Pinned in
`Modal.test.tsx` (asserts real `document.activeElement` behaviour over 12 tabs both directions —
not truthiness). `MonthGrid` carried booking status by **background colour alone** (WCAG 1.4.1) —
confirmed vs pending is "childcare is handled" vs "nobody is coming", so it can't rest on hue.
Added a visible glyph + spelled-out status in the accessible name; colour is now a redundant third
cue, and the legend teaches the glyphs.

### 4. `fix(ux)` — surface failures on every fire-and-forget action
Across four screens, async writes created a promise and dropped it (no await/catch/busy). A denied
or offline write left the UI unmoved — indistinguishable from a click that never landed, so the
user retried, and the retries are where it bit:
- **NannyDashboard** accept/decline/**claim**: a second tap on an open post races a row someone
  else may own. `assignNanny`'s "another nanny got there first" rejection is now the loudest thing
  on the page.
- **AdminPeoplePage** approve/reject/reinstate/advance: Lucy confirms a rejection, sees no error,
  moves on believing the applicant is declined — while the account is still pending and approvable.
  That's how an unvetted family gets in. Error scoped to the *row* so it names who's still wrong;
  callback types tightened to `Promise`-returning so a rejection can't be silently discarded.
- **Family/Nanny profile** photo+video upload and save: the wizard already handled rejections; only
  the post-onboarding editor didn't. Surfaces the storage layer's own actionable message.
- **ReviewModal.save**: had `try/finally` with no `catch` — a rejected review vanished silently.
  Reviews are Lucy/David's only ground-level match-quality signal; comment+rating now survive for a
  retry.

Also: added `scratchpad/` to `.gitignore` (session temp dir, was showing as untracked).

---

## Proof — everything green

| Suite | Result |
|---|---|
| Functions | ✅ 95 passed (11 files) |
| Rules | ✅ 49 passed, 4 skipped (was 37 — new storage.rules tests) |
| Client | ✅ full suite exit-0 (~355 `it()` cases / 38 files) |
| tsc `--noEmit` | ✅ clean |
| eslint `--max-warnings 0` | ✅ clean |

The storage.rules test run prints benign `EvaluationException: Null value` warnings at
`storage.rules:38` — those are the deny-path tests (a signed-in user with no `users/{uid}` doc);
the rule correctly denies and the tests assert failure. **Latent note:** `isSignedIn()` guards the
`firestore.get` against *anonymous* callers, but not against a signed-in user whose user-doc
doesn't exist yet — that case throws-then-denies (safe) rather than cleanly returning the default.
Not fixed this session (denies either way, out of scope), but worth a `.get('...', default)`-style
hardening later.

## Current state
Branch `landing-page-prelaunch`. **Four commits this session** on top of the previous 25 unpushed.
Nothing deployed, nothing public — the apex still serves the pre-launch landing page. The rules
change (#1) and storage change (#2) are the two that matter at the next deploy: prod is still
running the pre-Wave-1 rules, so `deploy:rules:prod` is what actually ships both.

## Next
- **Push the branch and confirm CI green** — the commit count is getting large and unverified on a
  real runner.
- The full Gate-2 deploy from `NEXT-SESSION.md §3` is still the plan (rules → functions, billing
  stays `enabled:false`). The rules diff to read line-by-line now includes the Pacific past-date
  window and the owner-or-approved storage reads.
- David's console blockers remain the real critical path: **start Stripe verification** (days-long),
  **Resend DNS** (apex SPF is an ADD, one record for both senders), **Stripe webhook secret** (still
  a placeholder — the only untested part of the money path).
- Deferred and still open: the webhook missing-invoice race (`NEXT-SESSION.md §0b`), the two money
  bugs in `Backlog.md`, Settings dead chrome + placeholder Calendly URL, F2 week calendar, F3 toast.

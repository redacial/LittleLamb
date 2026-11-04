# 2026-11-04 — Nanny profile overhaul: photo-first cards + accessible intro video

## Context
David is about to fill in real nanny data and wanted the nanny-facing experience to showcase
each person with "maximum ease": a scannable, warm, Tinder-style directory card (name + fun fact
over the photo) and a full profile whose intro video starts as you read, so you hear the nanny's
voice. He asked me to research UX best practice and keep it in line with the current design.

## Research (web-fetch subagent, primary sources)
Read NN/G "Text Over Images", NN/G "Cards", NN/G "Trustworthiness", and W3C WCAG 1.4.2 (Audio
Control). Two findings reshaped the literal brief, and I checked both with David via a question:
- A raw caregiver **age** over the photo reads dating-app; **years of experience** reads
  professional. Trust signals (background check) belong in a rigid, contrast-guaranteed strip
  **below** the photo, not overlaid on a user upload. → David chose "Tinder-style,
  warm-professional".
- **Autoplaying audio > 3s on page open violates WCAG 1.4.2.** Opening a profile isn't a request
  for sound. → David chose "autoplay muted + one-tap unmute".

## Done (all test-first; each new test proven to fail before the code existed)
- `funFact?: string` added to `NannyProfile` (≤120 chars), guarded in `firestore.rules`
  (`strMax('funFact', 120)` on nanny create + update). Optional — every reader tolerates absence.
- `src/components/NannyCard.tsx` — big 4:5 photo, name + fun fact on a bottom gradient scrim
  (white text clears 4.5:1 on any upload), trust chip + experience + rate + badges below in an
  identical layout on every card; whole photo + "View profile" link to the role-scoped profile;
  "Book" for families only; soft out-of-budget label (never a filter); initials fallback when no
  photo. 7 tests.
- `src/components/IntroVideo.tsx` — autoplays muted + looping with native controls always on, and
  a labelled "Tap to hear [FirstName]" button that unmutes from `currentTime = 0`. 3 tests.
- `NanniesDirectory` now renders `NannyCard`; shared `NannyProfilePage` renders `IntroVideo` +
  the fun fact. Fun-fact field added to the nanny setup wizard (Photo & bio step) and the nanny
  My Profile editor (+ "Fun fact" tick in the completeness indicator).
- Seed: `funFact` on all 12 nannies.
- Decision logged as **D74** in DECISIONS.md.

## State
- Typecheck clean; ESLint clean on all changed files.
- Affected suites green: NannyCard (7), IntroVideo (3), shared NannyProfilePage (3),
  NannyDashboard (2). Full suite was streaming all-green at handoff.
- Nothing deployed, nothing public. Billing still SAFE/untouched. No data model break — `funFact`
  is additive and optional.
- Note: `vitest run` lingers on teardown in this environment (not a hang — `Toast.test.tsx` ~6s
  then slow exit). `timeout`/`gtimeout` aren't installed on this Mac; run vitest backgrounded and
  read the summary rather than piping into `grep | head`.

## Next steps
- Verify visually in the real app with real/seed data: `npm run demo` (David runs it — the
  emulator must run in his terminal, see memory). Check the directory grid at 390 and 1440, and a
  full profile with an actual uploaded video (seed videos are null, so the IntroVideo only renders
  once a real `introVideoURL` exists).
- Consider: should the card's fun fact fall back to a bio excerpt when empty? Currently it just
  omits the line (clean). Leave unless David wants a fallback.
- The "Request outside hours" booking path on the profile is still intentionally unbuilt (see the
  long comment in `NannyProfilePage.tsx`) — unrelated to this session, still waiting on the
  booking-hook request side.

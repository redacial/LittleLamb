# 2026-08-05 — Application events wired + in-app messaging removed

## Goal
Continue from `NEXT-SESSION.md` Part 1: fire the notification events that had a backend but no client
call site. Mid-session the client **vetoed in-app messaging**, so scope expanded to fully removing
that feature.

## What was done (2 commits on `landing-page-prelaunch`)

1. **`feat: fire application notifications at their call sites`** — `useAdminActions`
   `approve`/`reject`/`advanceStage` now fire `application_approved` / `application_rejected` /
   `application_status_updated` after the write (fire-and-forget, per the `useBookings` pattern).
   Signatures widened to take `fullName` (+ `role`) from the `UserDoc` the caller already holds — no
   extra reads. Callers updated: `AdminPeoplePage` rows + `AdminDashboard` `ApplicationList` (gains a
   `role` prop).

2. **`feat: remove in-app messaging entirely (product veto)`** — full removal (scouted first for a
   complete footprint):
   - Deleted `src/pages/shared/MessagesPage.tsx` + `src/hooks/useMessages.ts`.
   - Removed `/messages` routes + sidebar nav items (all 3 roles) + the `messages` icon glyph.
   - Removed `Message`/`Conversation` types; the `conversations`+`messages` Firestore rules block;
     the `conversations` composite index.
   - Removed the `new_message` `NotificationEvent` variant everywhere — client union, functions
     shared copy (drift-guard **12→11**), email template `case`, recipient routing, and their tests
     (HTML-escape coverage re-pointed at applicant name; `mail`-rules-test event types swapped to a
     surviving one).
   - Removed the family + nanny dashboard "Messages" preview cards + their now-orphaned
     `ArrowRight`/`cn` imports; reworded the admin "Nanny cancellation requests" section.
   - Dropped the conversations/messages seed block.

## Key decisions (and why)
- **D43** — fired the 3 application events; widened signatures instead of adding a read since the
  caller already holds the `UserDoc`.
- **D44** — messaging removed wholesale (not just its notification). Reverses the messaging parts of
  D26 + the message rules. The `mail` outbound-email queue is untouched (not user messaging). CLAUDE.md
  still holds the old messaging spec — left as historical, superseded by D44 rather than rewritten.

## Current state
- **Green:** client build + **28** tests; functions build + lint + **33** tests (was 34 — dropped the
  `new_message` recipient test); rules **11** tests (emulator); landing build OK. `tsc` clean.
- No dangling messaging references in code (grep-verified).
- **Not deployed** — backend still waits on Blaze. No user-facing change shipped beyond removing the
  Messages nav/pages locally.
- Committed: `ae57877..5ab454b` (this session's two feature commits + this log/docs commit).

## Open item created by this session
- **Nanny cancellation request channel** — the spec routed it through admin messaging, now removed.
  How nannies request a cancellation is an OPEN business decision for Lucy (handled off-platform for
  now). Tracked in `NEXT-SESSION.md` and D44.

## Next steps
The only remaining pre-Blaze work is the **emulator end-to-end dry run** — see `NEXT-SESSION.md`.

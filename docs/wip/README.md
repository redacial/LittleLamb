# Work in progress — drafts, not part of the build

Files here are `.draft` on purpose: they are NOT compiled, NOT linted, and NOT run by any test
suite. They exist so half-finished work isn't lost between sessions.

**Currently empty.** The recurring-checkbox draft that lived here was completed and moved to
`src/pages/family/FamilyCalendarPage.test.tsx`; recurring bookings are now reachable from the
family calendar, gated by `resolveRecurring()` in `src/lib/recurring.ts`.

Keep this directory around for the next time a session ends mid-task — a `.draft` here is far
better than a broken file in `src/` or lost work.

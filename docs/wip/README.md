# Work in progress — drafts, not part of the build

Files here are `.draft` on purpose: they are NOT compiled, NOT linted, and NOT run by any test
suite. They exist so half-finished work isn't lost between sessions.

## `FamilyCalendarPage.recurring.test.tsx.draft`

The failing test for the **"Make this recurring" checkbox that does not exist yet**.

Context: `recurring: true` is currently set nowhere in `src/`, so the hourly `recurringAutoCancel`
job, `findRecurringConflicts`, the `recurring_booking_auto_cancelled` template and a composite
index are all unreachable — even though CLAUDE.md §11.4 calls weekly recurring the primary family
use case. The tested logic layer landed in commit `35c8482` (`resolveRecurring` + the auto-cancel
fix); only the UI control is missing.

This draft is the test-first artifact for that control, written before the session ran out. It
currently fails to typecheck with `Tuple type '[]' of length '0' has no element at index '0'` —
which is correct and expected: `createBooking` is never called because the checkbox isn't there.
**That is the failure it is supposed to have.**

To finish:
1. Move it to `src/pages/family/FamilyCalendarPage.test.tsx`.
2. Run it, confirm it fails for that reason.
3. Add the checkbox to the booking confirmation in `FamilyCalendarPage.tsx`, gated on
   `resolveRecurring()` from `src/lib/recurring.ts` so a family can never establish a standing
   claim on a slot no nanny agreed to.
4. Watch it pass.

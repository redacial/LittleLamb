# 2026-11-04 — Family calendar: Google-Calendar-style week view + drag-to-create

## Context
Third task of the day (after the nanny-profile overhaul `8b5d229` and the landing re-skin D75,
see the other two 2026-11-04 entries). David's ask: make the demo suite match the public-facing
design, then focus on the **calendar** — switch it to a **Google-Calendar-style week view**, let
the user **drag a time slot** (15-min increments) which opens a Google-Cal-like modal pre-filled
with the dragged times, purely in Little Lamb colours/feel. Next task (deferred): a nanny card
picker in place of the dropdown, with most-recommended nannies bubbling to the top once
matchmaking exists.

This executes the deferred booking design pass captured as Backlog **BK-1/BK-2** (scoped for v1
in D71). Logged as **D76**.

## Done
- Confirmed the "demo suite" IS the real app on emulators (`npm run demo`), already sharing the
  app's DESIGN_SYSTEM tokens with the landing page (D75 made the landing match the app). So
  "match public-facing" = build the calendar in that same language; no theme fork needed.
- **New `src/lib/time.ts` (+ `time.test.ts`, written first):** `hhmmToMinutes`, `minutesToHHMM`,
  `snapTo15`, `resolveSlot` (snaps both ends to 15 min + enforces a 1-hour minimum by extending
  the end). One home for the snap/min-duration math so drag + manual edits + tests agree. 8 tests.
- **New `src/components/calendar/WeekGrid.tsx` (+ `WeekGrid.test.tsx`, written first):** time axis
  6am–10pm in 15-min rows × 7 day columns, LL design language. Pointer-drag down a column shows a
  live sage selection band and fires `onCreateSlot(date, start, end)` on release. Past-day columns
  inert (mirrors MonthGrid). Per-day keyboard "+" button = the pointer-free a11y path (drag is
  pointer-only). Booking blocks reuse MonthGrid's glyph+colour+aria status convention. Optional
  `availability` prop shades the selected nanny's "usually free" bands. Built reusable
  (`availability` + `labelWith` props) for the future nanny availability editor. 8 tests.
- **`FamilyCalendarPage.tsx`:** added a Week/Month segmented toggle (week default), week-paging
  (`changeWeek`/`weekRangeLabel`/`startOfWeek`), conditional WeekGrid/MonthGrid render, wired
  `onCreateSlot` into the existing booking modal (now the drag-filled event popover), and
  `step={900}` on the Start/End time inputs. Existing test helper switched to click "Month" first
  so the old month-navigation specs still pass. Added 4 new week-view specs. 14 tests total.
- Updated Backlog (BK-1/BK-2 → DONE; added **BK-6** for the deferred card picker + recommendation
  bubbling), DECISIONS.md (**D76**), and this log.

## Decisions (and why)
- **D76 — presentation only.** All booking logic (`createBooking`, `resolveBookingStatus`,
  `resolveRecurring`, rate matching, 25h job-board routing) is untouched; the week grid only
  changes how `start`/`end`/`nanny`/`notes` are picked. Given this project's history of 3 shipped
  money/notification bugs, keeping logic out of a UI rewrite was the explicit guardrail.
- **Week default + Month toggle**, **family-only this pass but shared grid**, **keep the nanny
  dropdown / defer the card picker** — all confirmed with David (matchmaking logic for
  "most-recommended bubbling" doesn't exist yet; interim heuristic noted in BK-6).
- **Test-first** honoured (CLAUDE.md hard rule): time.ts, WeekGrid, and the new page specs were
  each watched failing for the right reason (missing module / missing toggle) before implementing.

## State
- Green on changed suites: `time` (8), `WeekGrid` (8), `FamilyCalendarPage` (14). Typecheck +
  ESLint clean on changed files. `npm run build` (app) succeeds.
- **Full `vitest run` was launched at handoff** to confirm no regression elsewhere — confirm it's
  green before relying on this entry.
- Nothing deployed. Billing still OFF/untouched. No data-model, rules, or behaviour change — the
  `Booking` shape (times as free-form `HH:MM`) is unchanged.
- NOT yet committed at time of writing — commit once the suite is green (WeekGrid.tsx/.test,
  time.ts/.test, FamilyCalendarPage.tsx/.test, Backlog.md, DECISIONS.md, this log).

## Next steps
- Visual check in the real app: **David runs `npm run demo`** (emulator processes die if the
  assistant backgrounds them — see memory). On `/family/calendar` at 390px and 1440px: week is
  default; drag down a day column snaps to 15 min / min 1h and opens the popover pre-filled; the
  "+" per-day button works via keyboard; a selected nanny's availability shades; Month toggle
  still works; past days inert; existing bookings render in the right time rows and open the
  detail modal.
- **BK-6 (next task):** replace the modal's nanny `<Select>` with a card picker (assign, or open a
  secondary full-bio modal), sorted by an interim availability+rate heuristic now and by real
  matchmaking once it lands. Reuse/extend `NannyCard.tsx`.
- Later: reuse `WeekGrid` for the nanny availability editor (drag-to-set-availability), per the
  "ONE shared grid" plan (D71 / Backlog).

# Session Log

A running, chronological record of work sessions on Little Lamb — the decisions made, what
was built, and what's left. This is the human-readable memory of the project's evolution.

## Protocol

**At the START of every session:**
1. Read `CLAUDE.md`, `DECISIONS.md`, and `Backlog.md` (the existing project docs).
2. Read this `session-log/README.md`, then read the **most recent** dated entry in this folder
   (they sort newest-last by filename `YYYY-MM-DD-*.md`). That tells you exactly where the last
   session left off and what the immediate next steps are.
3. Run `git log --oneline -15` to confirm what's actually committed.

**At the END of every session:**
1. Add or update a dated entry file in this folder: `session-log/YYYY-MM-DD-<slug>.md`.
   If an entry for today already exists, append to it; otherwise create a new one.
2. Each entry should cover: **what was done**, **decisions made (and why)**, **current state**
   (what's live / green / broken), and **next steps** (the precise handoff for the next session).
3. Keep decisions and their rationale — future sessions rely on the "why," not just the "what."
4. If a decision changes an earlier one, note the change; don't silently overwrite history.

## Entries

- `2026-07-20-landing-page-and-firebase.md` — Standalone pre-launch waitlist landing page built,
  moved repo out of iCloud, two Firebase projects (prod + staging) created, landing deployed &
  verified live on both. Custom domain blocked on Wix account access.
- `2026-08-04-backend-around-blaze.md` — Wrote the entire Cloud Functions backend (email via Resend,
  real iCal invites, 48h recurring auto-cancel, Stripe billing) so it compiles + unit-tests green
  but is NOT deployed (Blaze-gated). Resolved open items #13 (Resend) + #14 (iCal). First rules unit
  tests added. 73 tests green across 3 suites. Nothing deployed — waits on Blaze.

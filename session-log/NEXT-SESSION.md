# Next session plan — emulator end-to-end dry run

**Prereqs:** none new. No Blaze required — verifiable on the free Spark plan via the emulator + unit
tests. Start by reading `CLAUDE.md`, `DECISIONS.md` (esp. D35–D44), the two most recent
`session-log/` entries, then `git log --oneline -12`.

**Branch:** continue on `landing-page-prelaunch`. Commit per section.

---

## Context — what's already done

The Cloud Functions backend (email/Resend, iCal, recurring auto-cancel, Stripe) is written and
Blaze-gated for deploy. As of 2026-08-05:
- **Application notifications are wired** — `approve`/`reject`/`advanceStage` fire
  `application_approved/rejected/status_updated` (D43).
- **In-app messaging was removed entirely** (product veto, D44) — so the `new_message` event is
  gone; there are now **11** `NotificationEvent` variants, all fired from real call sites except the
  purely time-triggered ones (recurring auto-cancel, quarterly charge). No client trigger is missing.

So the only remaining pre-Blaze work is proving the pipeline end-to-end.

---

## The task — emulator end-to-end dry run *(no Blaze)*

Goal: with functions running in the emulator, exercise the real flows and watch a `mail` doc get
created → picked up by `onMailCreated` → rendered with its `.ics`. Closest thing to "it works"
before Blaze; catches any wiring gap now.

1. **Provider test keys (local only, never committed):** for the emulator run, provide a
   `RESEND_API_KEY` (Resend test key) + Stripe test keys via functions emulator secrets, OR — if a
   real Resend key isn't handy — temporarily stub `sendEmail` (functions/src/email/resend.ts) to
   `logger.info` instead of calling Resend, so the trigger path is still exercised end-to-end.
   Decide and note which.
2. `npm run emulators` (now includes functions) — or
   `firebase emulators:start --only functions,firestore,auth,storage`. Confirm all 4 boot and
   `onMailCreated` / `onWaitlistCreated` / `recurringAutoCancel` / `quarterlyCharge` register.
   (Java required — present locally at /opt/homebrew/opt/openjdk/bin.)
3. **Seed** with `npm run seed` (note: the conversations/messages seed block was removed; confirm it
   still seeds a family + nanny + booking; extend if needed).
4. **Drive the flows** (app pointed at emulators with `VITE_USE_FIREBASE_EMULATORS=true`, or a small
   script):
   - Approve a nanny → assert an `application_approved` `mail` doc appears and `onMailCreated`
     flips it to `sent`/`skipped`.
   - Create a confirmed booking → assert `booking_auto_confirmed` mail with an `.ics` attachment.
   - Trigger the scheduled functions manually (recurring auto-cancel; quarterly charge) and confirm
     dry-run behavior (invoices written `pending`, no charge, `dryRun: true`).
5. **Optionally extend `firestore-tests/`** with an emulator integration test for `onMailCreated`
   (create a `mail` doc → assert status transitions) if the manual run shows value.
6. Commit: `test: emulator end-to-end dry run of the notification + billing pipeline`.

---

## Wrap up
- Update `session-log/` with a new dated entry; refresh or delete this file.
- Full green: client 28+ / functions 33 / rules 11, all builds + functions lint clean.

## Further out (not this session)
- **Nanny cancellation request channel** — an OPEN decision after the messaging veto (D44). The spec
  routed it through admin messaging (removed). Needs a Lucy call on the new mechanism.
- Enable Blaze → deploy functions + set real secrets (`functions/README.md`).
- Firestore backups / PITR; App Check keys; custom domain (Wix access).
- Lucy's content items (badge list, policies, founder bios).

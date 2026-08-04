# Next session plan — finish event wiring + emulator end-to-end dry run

**Prereqs:** none new. No Blaze required — everything here is verifiable on the free Spark plan via
the emulator + unit tests. Start by reading `CLAUDE.md`, `DECISIONS.md` (esp. D35–D42),
`session-log/2026-08-04-backend-around-blaze.md`, then `git log --oneline -12`.

**Branch:** continue on `landing-page-prelaunch`. Commit per section.

---

## Context

Last session wrote the whole Cloud Functions backend (email, iCal, recurring auto-cancel, Stripe),
all Blaze-gated for deploy. The email backend (`onMailCreated` + `renderEmail`) handles **all 12**
`NotificationEvent` variants, but **4 of them are never fired from the client** — so once Blaze is
on, approving a nanny or sending a message would send no email. This session completes that wiring,
then proves the entire pipeline end-to-end in the emulator so launch day has no surprises.

---

## Part 1 — Wire the 4 unfired events *(pure code, no Blaze)*

The reusable pattern is the fire-and-forget `fireNotify` helper in `src/hooks/useBookings.ts:40-43`
(`notify(event).catch(() => {})`) — a notify failure must never reject the underlying write. Add
`import { notify, type NotificationEvent } from '../lib/notifications'` + a local `fireNotify` to
each target hook (neither imports `notify` today).

**Key constraint (from exploration):** the missing payload fields are NOT in scope inside the hooks,
but every one is already held by the calling component. Fix = widen the hook signatures (mirroring
the existing optional `meta?: BookingMeta` convention in `useBookingActions`) and pass the data
down — **no extra Firestore reads**.

### 1a. Application events — `src/hooks/useAdmin.ts` `useAdminActions()` (declared L132)
Fire *after* each `updateDoc` resolves:
- `approve(uid)` (L133-139) → widen to `approve(uid, fullName, role)` → fire
  `application_approved` `{ to: role, userId: uid, fullName }`.
- `reject(uid)` (L141-147) → widen to `reject(uid, fullName, role)` → fire `application_rejected`.
- `advanceStage(uid, stage)` (L149-151) → widen to `advanceStage(uid, stage, fullName)` → fire
  `application_status_updated` `{ to: 'nanny', userId: uid, fullName, stage }` (`NannyStage` already
  imported at L14).

**Caller:** `src/pages/admin/AdminPeoplePage.tsx:75-77` — the full `UserDoc u` is in scope
(`u.fullName`, `u.role`); pass `u.fullName` / `role` into each call.

### 1b. Message event — `src/hooks/useMessages.ts` `useMessageActions().send` (L67-93)
Fire `new_message` after the two writes (L78-85 message, L86-90 conversation). Widen
`send(...)` to also accept `recipientId` and `senderName` (or the active `Conversation`).
- `conversationId` ✓ and `preview` ✓ (`clean.slice(0,120)`) are already in scope.
- **Caller:** `src/pages/shared/MessagesPage.tsx:46` — the active `Conversation` (`active`, L26)
  carries `participantIds` + `participantNames`. Derive `recipientId` = the participant in
  `active.participantIds` that isn't `senderId`; `senderName` = `active.participantNames[senderId]`.

Payload: `{ type: 'new_message', to: 'recipient', conversationId, recipientId, senderName, preview }`.

### 1c. Verify + commit
- `npm run build` + `npm test` (client, still 28) green; `tsc -b --noEmit` clean.
- Add a tiny client test if useful (e.g. the recipient-derivation helper for `new_message`).
- Commit: `feat: fire application + message notifications at their call sites`.

---

## Part 2 — Emulator end-to-end dry run *(no Blaze; proves the whole pipeline)*

Goal: with functions running in the emulator, exercise the real flow and watch a `mail` doc get
created → picked up by `onMailCreated` → rendered with its `.ics`. This is the closest thing to
"it works" before Blaze and will catch any wiring gap now.

1. **Provider test keys (local only, never committed):** set `RESEND_API_KEY` (Resend test key) and
   Stripe test keys for the emulator run. For functions emulator, use a local `.secret.local` or
   `functions:secrets:set` against the emulator, OR temporarily read from `process.env` — decide and
   document. If a real Resend key isn't handy, stub `sendEmail` to log instead so the trigger path is
   still exercised end-to-end.
2. `npm run emulators` (now includes functions) — or
   `firebase emulators:start --only functions,firestore,auth,storage`. Confirm all 4 boot and
   `onMailCreated` / `recurringAutoCancel` register.
3. **Seed** a family + nanny + an approved-nanny booking (`npm run seed` — check `scripts/seed.mjs`
   covers what's needed; extend if not).
4. **Drive the flows** (via the app pointed at emulators, `VITE_USE_FIREBASE_EMULATORS=true`, or a
   small script):
   - Approve a nanny → assert an `application_approved` `mail` doc appears and `onMailCreated`
     transitions it to `sent`/`skipped`.
   - Create a confirmed booking → assert `booking_auto_confirmed` mail with an `.ics` attachment.
   - Send a message → assert `new_message` mail to the right recipient.
   - Manually invoke the recurring/quarterly scheduled functions (emulator lets you trigger them)
     and confirm dry-run behavior (invoices written `pending`, no charge).
5. **Extend `firestore-tests/`** with an emulator integration test for `onMailCreated` if the manual
   run reveals value (create a `mail` doc → assert status flips). Optional but cheap.
6. Commit: `test: emulator end-to-end dry run of the notification + billing pipeline`
   (+ any seed/script additions).

---

## Part 3 — Wrap up
- Update `session-log/` with a new dated entry; refresh this `NEXT-SESSION.md` (or delete it) so it
  reflects the new frontier.
- Full green: client 28+ / functions 34 / rules 11, all builds + functions lint clean.

## Still further out (not this session)
- Enable Blaze → deploy functions + set real secrets (see `functions/README.md`).
- Firestore backups / PITR; App Check keys; custom domain (Wix access).
- Lucy's content items (badge list, policies, founder bios).

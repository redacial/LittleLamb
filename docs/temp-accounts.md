# Temp Accounts — Local Preview

Three ready-to-use accounts (one per role), each fully approved and populated, so you can
click through the entire family, nanny, and admin experience locally.

These live **only in the Firebase Emulator Suite** — a local, in-memory copy of Firebase.
They touch no real project and reset every time you restart the emulators.

## Credentials

| Role   | Email                     | Password   | Lands on        |
|--------|---------------------------|------------|-----------------|
| Family | `family@littlelamb.test`  | `lamb1234` | Family dashboard |
| Nanny  | `nanny@littlelamb.test`   | `lamb1234` | Nanny dashboard  |
| Admin  | `admin@littlelamb.test`   | `lamb1234` | Admin dashboard  |

When logging in as Family or Nanny, pick the matching role toggle ("I am a Family" /
"I am a Nanny") on the login screen. Admin routes itself automatically.

## How to launch (one command)

```bash
npm run preview:local
```

This starts the emulators, loads the temp accounts + sample data, and launches the app —
all in one terminal. Press Ctrl+C once to shut everything down together. Then open the URL
Vite prints (usually http://localhost:5173) and log in.

> Why one command works: `preview:local` uses `firebase emulators:exec`, which boots the
> emulators, waits until they're ready, then runs `npm run seed && npm run dev`. Because the
> dev server stays running, the emulators stay up alongside it for the whole session.

### Manual alternative (three terminals)

If you'd rather run the pieces separately:

```bash
# Terminal 1 — start the local Firebase emulators
npm run emulators

# Terminal 2 — load the temp accounts + sample data into the emulators
npm run seed

# Terminal 2 (after seeding) — start the app
npm run dev
```

- Emulator data dashboard: http://127.0.0.1:4000
- Re-run `npm run seed` any time to reset the sample data (it's idempotent).
- The emulators hold data only while running — restart them and re-seed to get a clean slate.

## What's pre-loaded

- **Family** (The Hartley Family): full profile, 2 kids, payment method on file, a paid invoice,
  an upcoming recurring booking, a past booking (triggers a review prompt), a pending request,
  and an admin message thread.
- **Nanny** (Maya Brooks): full profile, bio, badges (self + verified), weekly availability,
  the bookings above, plus an open booking to pick up, and an admin message thread.
- **Directory**: 3 nannies total (Maya, Sofia, Grace) so "Our Nannies" is populated.
- **Admin** (Lucy): sees all of the above, plus **2 pending applications** (one family, one nanny)
  waiting in the dashboard to approve/reject.

## Note on configuration

`.env` has `VITE_USE_FIREBASE_EMULATORS=true`, which points the app at the local emulators.
Set it back to `false` (and fill in real Firebase values) when connecting to a live project.

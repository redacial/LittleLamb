# Little Lamb — Cloud Functions

Firebase Cloud Functions backend for Little Lamb Nannies: transactional email (Resend),
calendar invites (iCal), the 48h recurring auto-cancel job, and Stripe billing.

## Status: written, NOT deployed

Everything here compiles and unit-tests green but is **not deployed**. Deployment requires
the Firebase **Blaze** (pay-as-you-go) plan, which is enabled separately. Until then this
code is exercised via the local emulator (which runs on the free Spark plan) and Vitest.

## Layout

```
src/
  index.ts        Re-exports every trigger — the ONLY file the deploy scanner reads.
  firebase.ts     Admin SDK singletons (db, auth, storage). All Firestore access goes through here.
  config.ts       defineSecret handles (Resend/Stripe) + platform constants.
  shared/         Pure code COPIED from the client (no Firebase/DOM), kept in sync by tests:
                    notifications-events.ts  the NotificationEvent union (mirror of src/lib/notifications.ts)
                    recurring.ts             copy of the pure findRecurringConflicts
                    ical.ts                  the pure iCal generator (authored here, copied to src/lib/ical.ts)
  email/          Resend client, per-event templates, recipient resolution, the mail-doc trigger.
  billing/        Stripe setup-intent/save-PM (onCall), quarterly charge, invoice PDF, webhook.
  scheduled/      Time-triggered jobs (recurring auto-cancel).
  waitlist/       Waitlist signup → admin notification.
```

## Conventions

- `index.ts` re-exports only. One trigger per file, exporting one function.
- Admin access via `./firebase` singletons; secrets via `./config` bound per-function.
- Pure logic (templates, ical, recurring, invoice math) has no Firebase import → unit-tests
  without the emulator.

## Why `shared/` is copied, not imported

The client (`../src`) compiles under Vite (bundler resolution, `import.meta.env`, DOM libs);
this package compiles CommonJS for Node. Cross-importing pulls incompatible module settings
into a Node `tsconfig`. The three shared pieces are pure and stable, so they are copied and
guarded by `shared/*.test.ts` that pins their shape against drift from the client originals.

## Commands

```
npm run build       # tsc -b
npm test            # vitest (pure unit tests, no emulator/network)
npm run serve       # build + firebase emulators (functions,firestore,auth,storage)
```

## Blaze-day checklist

1. Enable Blaze on `littlelamb-sb` (and staging).
2. `firebase deploy --only functions`
3. Set secrets:
   `firebase functions:secrets:set RESEND_API_KEY`
   `firebase functions:secrets:set STRIPE_SECRET_KEY`
   `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`
4. Verify a real signup approval sends a real email; a booking fires confirmations + iCal.
5. Flip `config/billing.enabled = true` in Firestore when ready to charge families for real.

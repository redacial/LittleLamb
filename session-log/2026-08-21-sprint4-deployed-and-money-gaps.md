# 2026-08-21 — Sprint 4: the fixes finally went live, and the money gaps closed

## Context

Waves 1–3 had fixed eight bugs but **none of it was in production** — 26 commits sat unpushed and
prod still ran pre-Wave-1 code, including the billing bug that invoices nobody. David's call:
**deploy to the private surface first**, then fix both money bugs and the webhook race.

---

## Shipped to production (two deploys, both verified)

1. **Rules** — already current; confirmed rather than assumed.
2. **Functions** — all 7 updated. This is what finally put the `nextChargeDate` fix, all five
   notification call sites, and the webhook refactor into production.
3. **Functions again** — a new 8th function (`onInvoiceCreated`) shipped later in the sprint.

Verified each time: 8 ACTIVE, webhook returns 400 to an unsigned POST, billing safety confirmed at
the code level (strict `=== true`, defaulting to dry-run, Stripe call fenced behind it).
**The apex still serves the landing page. The app is still unpromoted.**

---

## The money gaps, closed

### Invoices were written by the server and read by nobody
`grep "collection(db, 'invoices')" src/` returned **zero**. Both invoice histories were hardcoded
placeholder text, so every invoice the billing job ever wrote was invisible.

Worse, the client `Invoice` type matched the server on **zero money fields** — it declared `total`
in dollars while the server writes `totalCents`. A $27.00 invoice is stored as `2700`. Reconciled to
cents-everywhere, converting once at render. The agent **deliberately shipped the 100× bug** to
prove the assertions bite, and watched the anti-`$2,700.00` assertion fire.

`dryRun` invoices are now unmistakable — dashed border, struck amount, status pill replaced — because
the billing job records `status:'paid'` **independently of `dryRun`**, so status alone never told an
admin whether money actually moved.

### Hardcoded rates in THREE places, one of them printed
`$25`/`$1` were hardcoded while `config/billing` is what the server charges from. Change the price in
Settings and families saw the old number while their card took the new one. The third consumer was
the worst: `AdminBillingPage` feeds `exportBillingTable() → downloadCSV`, so **the stale rate landed
in the accounting spreadsheet handed to a bookkeeper**, and `FamilyBillingPage` feeds `printInvoice`,
so it printed on a document families keep. All three now read `useBillingConfig()`.

### The webhook silently dropped paid statuses
`markInvoice` read-then-wrote and no-op'd when the invoice was absent, so a webhook beating
`writeInvoice` left the invoice `pending` forever though Stripe took the money.

Both obvious fixes were **rejected for a specific reason**: create-then-merge or writing by id would
put status-only docs into `invoices` — which the invoice list built *in the same sprint* renders
verbatim, so they'd appear as real blank $0 invoices, and could resurrect a deliberately deleted one.
Instead `markInvoice` uses `update()` (fails NOT_FOUND, cannot create), parks unmatched outcomes in a
server-only collection under default-deny, and a new `onInvoiceCreated` trigger drains it. The parked
status wins over `writeInvoice`, because Stripe is the authority on whether money moved.

### CSV formula injection
`toCSV` didn't neutralise a leading `=`/`+`/`@`, and the export includes family names — user input.
`=HYPERLINK("http://evil","Click")` became a live link in the bookkeeper's spreadsheet. Now prefixed
with an apostrophe. **`-` is deliberately excluded**: negative numbers are real accounting data, and
escaping them would corrupt every refund and credit — a certain harm against a marginal one.

---

## Reviews were write-only

One `addDoc`, **zero readers anywhere**. Families and nannies were prompted to write reviews no human
could ever read, silently discarding their effort. Added `useReviews(subjectId)` on the bounded
`useGrowingCollection` helper and a modal from every admin person row. Retroactive by construction.

## Three controls that lied, removed

The Settings **Account** tab (password change with no handler), the **Email templates** tab (could
never persist — `renderNotification` builds every body from a hardcoded switch in `functions/`), and
**"Request outside hours"** on the nanny profile. Each removed with its requirements documented rather
than silently deleted. Same principle as the fabricated social proof: *a control that looks like it
works and does nothing is worse than no control.*

## A latent test bug worth knowing about

The `useAdmin` mock returned a fresh badges array every render, which `BadgeCatalogCard` syncs via
`useEffect([badges])` — an infinite render loop that **OOM-killed the vitest worker** (exit 144). It
only surfaced once Badges became the first tab. That explains the intermittent whole-suite hangs
several agents hit. Array hoisted to a stable const.

---

## Current state

- **Green: 208 client / 95 functions / 23 rules = 326** (was 243). tsc clean, lint clean.
- **8 commits this sprint**, all pushed. Prod running the current code.
- **Nothing public.** Apex still landing page; app unpromoted.

## Still blocked on David (both re-verified today, unchanged)
- **Resend DNS absent** — no email can send. ⚠️ The apex SPF record is **missing entirely**, so this
  is an ADD, not a merge.
- **`STRIPE_WEBHOOK_SECRET`** is still literally `placeholder-not-a-real-key`.

## Next
1. Recurring checkbox — logic layer is live, UI missing, failing test drafted at `docs/wip/`.
2. Local three-role E2E (seed gaps are now closed, so it should read clean).
3. ⚠️ The card path **cannot** be tested locally — `PaymentStep` falls back to a checkbox when Stripe
   is unconfigured, so `createSetupIntent`/`savePaymentMethod` have never run outside prod.
4. Before billing ever goes live: `npm run backfill:billing -- --prod`.

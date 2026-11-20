import { useAuth } from '../../context/AuthContext'
import { useMyBookings } from '../../hooks/useBookings'
import { useBillingConfig } from '../../hooks/useAdmin'
import { stripeEnabled } from '../../hooks/useBilling'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Button } from '../../components/ui'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'
import { printInvoice } from '../../lib/exporters'

/** Family billing — running quarter count, estimated next bill, invoice history. */
export function FamilyBillingPage() {
  const { user, profile } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'family')
  // Rates were hardcoded here as 25 / 1 while the server charges from config/billing
  // (functions/src/billing/quarterlyCharge.ts → loadRates). Any price change in
  // Settings left this page quoting the OLD figure — including on the printed invoice.
  //
  // UNITS: the config stores CENTS (2500); everything below this line is DOLLARS, which is
  // what money() and printInvoice expect. Convert once, here, and never again downstream.
  const { config, loading: ratesLoading } = useBillingConfig()
  // The yearly subscription price. The retired per-booking fee (config.perBookingCents) is no
  // longer shown — the model is "first two bookings free, then a yearly subscription" (D77).
  const subscription = config.subscriptionCents / 100

  // Free-launch guard. Little Lamb launches FREE (billing off), and the Billing nav tab is
  // hidden then (see navFor). A family can still reach this URL directly, so show a plain
  // free-service panel instead of any pricing — never quote "$25/quarter" to someone who will
  // not be charged. The pricing view below returns when billing is switched on.
  if (!stripeEnabled) {
    return (
      <>
        <PageHeader title="Billing" subtitle="You're all set." />
        <PageBody>
          <Card tone="peri">
            <div className="flex items-center justify-between gap-3">
              <CardLabel className="mb-0">Little Lamb is free</CardLabel>
              <span className="trust-chip">No charge</span>
            </div>
            <p className="mt-3 text-sm text-ll-ink">
              Little Lamb is <span className="font-bold text-ll-sage-deep">free</span> for families
              during our beta — there's nothing to pay right now. When billing turns on, your first
              two bookings stay free, then it's a $150/year subscription. You always pay your sitter
              directly; no wages pass through Little Lamb.
            </p>
          </Card>
        </PageBody>
      </>
    )
  }

  const confirmedThisQuarter = bookings.filter((b) => b.status === 'confirmed').length

  // Summary rendered as a print-ready document (browser "Save as PDF"). NOTE: the exact
  // free-first-two-bookings / yearly-proration math belongs to the billing-model project
  // (deferred, D77); billing is gated OFF today, so this path is unreachable. The line item
  // reflects the yearly subscription, not the retired per-quarter + per-booking model.
  function downloadInvoice() {
    const now = new Date()
    const issuedAt = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    printInvoice({
      invoiceNumber: `LL-${now.getFullYear()}`,
      familyName: profile?.fullName ?? 'Little Lamb family',
      quarterLabel: `${now.getFullYear()}`,
      issuedAt,
      lineItems: [{ label: 'Annual subscription', amount: subscription }],
      total: subscription,
    })
  }

  // Hold the whole page until the rates resolve. Rendering the hook's safe default first
  // would flash $25 at a family on a $30 plan — a number they may well screenshot, and one
  // that would be PRINTED if they hit download during that frame.
  if (ratesLoading)
    return (
      <>
        <PageHeader title="Billing" subtitle="A simple yearly subscription." />
        <PageBody>
          <p className="text-ll-warm-gray">Loading…</p>
        </PageBody>
      </>
    )

  return (
    <>
      <PageHeader title="Billing" subtitle="A simple yearly subscription." />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Confirmed bookings" value={confirmedThisQuarter} />
          <SummaryCard label="Subscription" value={money(subscription)} accent hint="Per year" />
          <SummaryCard label="First two bookings" value="Free" hint="Then your subscription applies" />
        </div>

        <Card className="mt-6" tone="peri">
          <div className="flex items-center justify-between gap-3">
            <CardLabel className="mb-0">How billing works</CardLabel>
            <span className="trust-chip">No surprises</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-ll-ink">
            <li className="flex gap-2.5">
              <Dot />
              <span>Your first two bookings are <span className="font-mono text-ll-peri-ink">free</span>.</span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>
                After that, a <span className="font-mono text-ll-peri-ink">{money(subscription)}</span> yearly
                subscription for access to the board.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>You pay your sitter directly — no wages pass through Little Lamb.</span>
            </li>
          </ul>
        </Card>

        <Card className="mt-6">
          <CardLabel>Invoice history</CardLabel>
          <p className="mt-2 text-sm text-ll-warm-gray">
            Your past invoices will appear here once your first subscription charge posts. In the
            meantime, you can download a summary.
          </p>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={downloadInvoice}>
              Download summary (PDF)
            </Button>
          </div>
        </Card>
      </PageBody>
    </>
  )
}

/** Small static sage marker for list rows (replaces a raw bullet glyph). */
function Dot() {
  return (
    <span
      aria-hidden
      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ll-sage-mid"
    />
  )
}

import { useAuth } from '../../context/AuthContext'
import { useMyBookings } from '../../hooks/useBookings'
import { useBillingConfig } from '../../hooks/useAdmin'
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
  const subscription = config.subscriptionCents / 100
  const perBooking = config.perBookingCents / 100

  const confirmedThisQuarter = bookings.filter((b) => b.status === 'confirmed').length
  const estimate = subscription + confirmedThisQuarter * perBooking

  // Current-quarter summary rendered as a print-ready invoice (browser "Save as PDF").
  function downloadInvoice() {
    const issuedAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    printInvoice({
      invoiceNumber: `LL-${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      familyName: profile?.fullName ?? 'Little Lamb family',
      quarterLabel: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
      issuedAt,
      lineItems: [
        { label: 'Platform subscription', amount: subscription },
        { label: `Confirmed bookings (${confirmedThisQuarter} × ${money(perBooking)})`, amount: confirmedThisQuarter * perBooking },
      ],
      total: estimate,
    })
  }

  // Hold the whole page until the rates resolve. Rendering the hook's safe default first
  // would flash $25 at a family on a $30 plan — a number they may well screenshot, and one
  // that would be PRINTED if they hit download during that frame.
  if (ratesLoading)
    return (
      <>
        <PageHeader title="Billing" subtitle="Simple, quarterly, no surprises." />
        <PageBody>
          <p className="text-ll-warm-gray">Loading…</p>
        </PageBody>
      </>
    )

  return (
    <>
      <PageHeader title="Billing" subtitle="Simple, quarterly, no surprises." />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Bookings this quarter" value={confirmedThisQuarter} />
          <SummaryCard label="Estimated next bill" value={money(estimate)} accent />
          <SummaryCard label="Billing cycle" value="Quarterly" hint="Every 90 days from signup" />
        </div>

        <Card className="mt-6" tone="peri">
          <div className="flex items-center justify-between gap-3">
            <CardLabel className="mb-0">How billing works</CardLabel>
            <span className="trust-chip">No surprises</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-ll-ink">
            <li className="flex gap-2.5">
              <Dot />
              <span>
                <span className="font-mono text-ll-peri-ink">{money(subscription)}</span> flat platform
                subscription per quarter
              </span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>
                <span className="font-mono text-ll-peri-ink">{money(perBooking)}</span> per confirmed
                booking, accumulated through the quarter
              </span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>Auto-charged every 90 days. A PDF invoice is emailed and stored here.</span>
            </li>
          </ul>
        </Card>

        <Card className="mt-6">
          <CardLabel>Invoice history</CardLabel>
          <p className="mt-2 text-sm text-ll-warm-gray">
            Your past invoices will appear here once your first billing cycle closes. In the
            meantime, you can download this quarter's running summary.
          </p>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={downloadInvoice}>
              Download this quarter (PDF)
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

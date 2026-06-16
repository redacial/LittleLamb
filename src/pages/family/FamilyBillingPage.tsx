import { useAuth } from '../../context/AuthContext'
import { useMyBookings } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Button } from '../../components/ui'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'
import { printInvoice } from '../../lib/exporters'

const SUBSCRIPTION = 25
const PER_BOOKING = 1

/** Family billing — running quarter count, estimated next bill, invoice history. */
export function FamilyBillingPage() {
  const { user, profile } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'family')
  const confirmedThisQuarter = bookings.filter((b) => b.status === 'confirmed').length
  const estimate = SUBSCRIPTION + confirmedThisQuarter * PER_BOOKING

  // Current-quarter summary rendered as a print-ready invoice (browser "Save as PDF").
  function downloadInvoice() {
    const issuedAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    printInvoice({
      invoiceNumber: `LL-${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      familyName: profile?.fullName ?? 'Little Lamb family',
      quarterLabel: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
      issuedAt,
      lineItems: [
        { label: 'Platform subscription', amount: SUBSCRIPTION },
        { label: `Confirmed bookings (${confirmedThisQuarter} × ${money(PER_BOOKING)})`, amount: confirmedThisQuarter * PER_BOOKING },
      ],
      total: estimate,
    })
  }

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
                <span className="font-mono text-ll-peri-ink">{money(SUBSCRIPTION)}</span> flat platform
                subscription per quarter
              </span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>
                <span className="font-mono text-ll-peri-ink">{money(PER_BOOKING)}</span> per confirmed
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

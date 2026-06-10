import { useAuth } from '../../context/AuthContext'
import { useMyBookings } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Button } from '../../components/ui'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'

const SUBSCRIPTION = 25
const PER_BOOKING = 1

/** Family billing — running quarter count, estimated next bill, invoice history. */
export function FamilyBillingPage() {
  const { user } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'family')
  const confirmedThisQuarter = bookings.filter((b) => b.status === 'confirmed').length
  const estimate = SUBSCRIPTION + confirmedThisQuarter * PER_BOOKING

  return (
    <>
      <PageHeader title="Billing" subtitle="Simple, quarterly, no surprises." />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Bookings this quarter" value={confirmedThisQuarter} />
          <SummaryCard label="Estimated next bill" value={money(estimate)} accent />
          <SummaryCard label="Billing cycle" value="Quarterly" hint="Every 90 days from signup" />
        </div>

        <Card className="mt-6">
          <CardLabel>How billing works</CardLabel>
          <ul className="mt-2 space-y-1 text-sm text-charcoal">
            <li>· {money(SUBSCRIPTION)} flat platform subscription per quarter</li>
            <li>· {money(PER_BOOKING)} per confirmed booking, accumulated through the quarter</li>
            <li>· Auto-charged every 90 days; a PDF invoice is emailed and stored here</li>
          </ul>
        </Card>

        <Card className="mt-6">
          <CardLabel>Invoice history</CardLabel>
          <p className="mt-2 text-sm text-charcoal-muted">
            Your past invoices will appear here once your first billing cycle closes.
          </p>
          <div className="mt-3">
            <Button variant="secondary" size="sm" disabled>Download latest (PDF)</Button>
          </div>
        </Card>
      </PageBody>
    </>
  )
}

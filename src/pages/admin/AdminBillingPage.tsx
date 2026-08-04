import { useAllBookings, useUsersByRole, useBillingAlerts } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { Card, CardLabel, Button } from '../../components/ui'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'
import { downloadCSV } from '../../lib/exporters'

const SUBSCRIPTION = 25
const PER_BOOKING = 1
const DONATION_RATE = 0.1

/** Admin Billing & Accounting — Overview / Current Billing / Invoice History / Accounting. */
export function AdminBillingPage() {
  const bookings = useAllBookings()
  const { users: families } = useUsersByRole('family')
  const billingAlerts = useBillingAlerts()
  const activeFamilies = families.filter((f) => f.approved).length
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const revenue = activeFamilies * SUBSCRIPTION + confirmed * PER_BOOKING
  const donation = revenue * DONATION_RATE

  // Per-family confirmed-booking counts for the exported billing table.
  function bookingsForFamily(uid: string) {
    return bookings.filter((b) => b.familyId === uid && b.status === 'confirmed').length
  }

  function exportBillingTable() {
    const rows = families
      .filter((f) => f.approved)
      .map((f) => {
        const count = bookingsForFamily(f.uid)
        return {
          Family: f.fullName,
          Email: f.email,
          'Subscription (qtr)': SUBSCRIPTION,
          'Confirmed bookings': count,
          'Booking fees': count * PER_BOOKING,
          'Quarter total': SUBSCRIPTION + count * PER_BOOKING,
        }
      })
    downloadCSV(`little-lamb-billing-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <>
      <PageHeader title="Billing & accounting" subtitle="The platform’s financial picture." />
      <PageBody>
        <Tabs tabs={['Overview', 'Current billing', 'Invoice history', 'Accounting']}>
          {(active) => {
            if (active === 'Overview')
              return (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <SummaryCard label="Quarterly revenue" value={money(revenue)} accent />
                    <SummaryCard label="Active families" value={activeFamilies} />
                    <SummaryCard label="Donation owed (10%)" value={money(donation)} />
                  </div>
                  {billingAlerts.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardLabel>Failed payments</CardLabel>
                      <div className="mt-2 space-y-2">
                        {billingAlerts.map((a) => (
                          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm">
                              <span className="font-semibold text-ll-ink">{a.familyName ?? a.familyId}</span>
                              {typeof a.amountCents === 'number' && (
                                <span className="text-ll-warm-gray"> — {money(a.amountCents / 100)}</span>
                              )}
                            </p>
                            <Button size="sm" variant="secondary">Retry payment</Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )

            if (active === 'Current billing')
              return (
                <div className="space-y-3">
                  {families.filter((f) => f.approved).length === 0 ? (
                    <Card className="bg-ll-cream"><p className="text-sm text-ll-warm-gray">No active families yet.</p></Card>
                  ) : (
                    families
                      .filter((f) => f.approved)
                      .map((f) => (
                        <Card key={f.uid} className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ll-ink">{f.fullName}</p>
                            <p className="text-sm text-ll-warm-gray">Subscription <span className="font-mono">{money(SUBSCRIPTION)}</span>/qtr</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary">Trigger invoice</Button>
                          </div>
                        </Card>
                      ))
                  )}
                  <Button variant="ghost" size="sm" onClick={exportBillingTable}>Download billing table (Excel)</Button>
                </div>
              )

            if (active === 'Invoice history')
              return (
                <Card className="bg-ll-cream">
                  <CardLabel>Invoice history</CardLabel>
                  <p className="text-sm text-ll-warm-gray">Invoices appear here as billing cycles close. Searchable by family and date; per-invoice PDF download.</p>
                </Card>
              )

            return (
              <div className="space-y-4">
                <Card tone="sage" className="bg-ll-sage-light">
                  <CardLabel>Quarterly donation tracker</CardLabel>
                  <p className="mt-1 font-mono text-3xl font-medium leading-tight text-ll-ink">{money(donation)}</p>
                  <p className="mt-1 text-sm text-ll-warm-gray">Auto-calculated as 10% of this quarter’s revenue.</p>
                  <Button className="mt-3" size="sm">Mark as donated</Button>
                </Card>
                <Card className="bg-ll-cream">
                  <CardLabel>Donation history</CardLabel>
                  <p className="text-sm text-ll-warm-gray">Date, amount, and quarter for every past donation. Included in the Excel export.</p>
                </Card>
              </div>
            )
          }}
        </Tabs>
      </PageBody>
    </>
  )
}

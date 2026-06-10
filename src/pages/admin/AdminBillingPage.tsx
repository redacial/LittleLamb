import { useAllBookings, useUsersByRole } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { Card, CardLabel, Button } from '../../components/ui'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'

const SUBSCRIPTION = 25
const PER_BOOKING = 1
const DONATION_RATE = 0.1

/** Admin Billing & Accounting — Overview / Current Billing / Invoice History / Accounting. */
export function AdminBillingPage() {
  const bookings = useAllBookings()
  const { users: families } = useUsersByRole('family')
  const activeFamilies = families.filter((f) => f.approved).length
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const revenue = activeFamilies * SUBSCRIPTION + confirmed * PER_BOOKING
  const donation = revenue * DONATION_RATE

  return (
    <>
      <PageHeader title="Billing & accounting" subtitle="The platform’s financial picture." />
      <PageBody>
        <Tabs tabs={['Overview', 'Current billing', 'Invoice history', 'Accounting']}>
          {(active) => {
            if (active === 'Overview')
              return (
                <div className="grid gap-4 sm:grid-cols-3">
                  <SummaryCard label="Quarterly revenue" value={money(revenue)} accent />
                  <SummaryCard label="Active families" value={activeFamilies} />
                  <SummaryCard label="Donation owed (10%)" value={money(donation)} />
                </div>
              )

            if (active === 'Current billing')
              return (
                <div className="space-y-3">
                  {families.filter((f) => f.approved).length === 0 ? (
                    <Card className="bg-cream-100"><p className="text-sm text-charcoal-muted">No active families yet.</p></Card>
                  ) : (
                    families
                      .filter((f) => f.approved)
                      .map((f) => (
                        <Card key={f.uid} className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{f.fullName}</p>
                            <p className="text-sm text-charcoal-muted">Subscription {money(SUBSCRIPTION)}/qtr</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary">Trigger invoice</Button>
                          </div>
                        </Card>
                      ))
                  )}
                  <Button variant="ghost" size="sm">Download billing table (Excel)</Button>
                </div>
              )

            if (active === 'Invoice history')
              return (
                <Card className="bg-cream-100">
                  <CardLabel>Invoice history</CardLabel>
                  <p className="text-sm text-charcoal-muted">Invoices appear here as billing cycles close. Searchable by family and date; per-invoice PDF download.</p>
                </Card>
              )

            return (
              <div className="space-y-4">
                <Card>
                  <CardLabel>Quarterly donation tracker</CardLabel>
                  <p className="mt-1 font-display text-3xl">{money(donation)}</p>
                  <p className="text-sm text-charcoal-muted">Auto-calculated as 10% of this quarter’s revenue.</p>
                  <Button className="mt-3" size="sm">Mark as donated</Button>
                </Card>
                <Card className="bg-cream-100">
                  <CardLabel>Donation history</CardLabel>
                  <p className="text-sm text-charcoal-muted">Date, amount, and quarter for every past donation. Included in the Excel export.</p>
                </Card>
              </div>
            )
          }}
        </Tabs>
      </PageBody>
    </>
  )
}

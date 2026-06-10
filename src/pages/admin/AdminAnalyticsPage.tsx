import { useAllBookings, useUsersByRole } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'

const SUBSCRIPTION = 25
const PER_BOOKING = 1
const TARGET_RATIO = 4

/** Admin analytics — Overview / Platform Health / Revenue / Bookings / Growth (live where possible). */
export function AdminAnalyticsPage() {
  const bookings = useAllBookings()
  const { users: families } = useUsersByRole('family')
  const { users: nannies } = useUsersByRole('nanny')

  const activeFamilies = families.filter((f) => f.approved).length
  const activeNannies = nannies.filter((n) => n.approved).length
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length
  const unmatched = bookings.filter((b) => b.status === 'unmatched').length
  const recurring = bookings.filter((b) => b.recurring).length
  const revenue = activeFamilies * SUBSCRIPTION + confirmed * PER_BOOKING
  const ratio = activeFamilies > 0 ? (activeNannies / activeFamilies).toFixed(1) : '—'
  const pendingNannies = nannies.filter((n) => n.status === 'pending').length
  const completionRate = confirmed + cancelled > 0 ? Math.round((confirmed / (confirmed + cancelled)) * 100) : 0

  return (
    <>
      <PageHeader title="Analytics" subtitle="Platform health at a glance." />
      <PageBody>
        <Tabs tabs={['Overview', 'Platform health', 'Revenue', 'Bookings', 'Growth']}>
          {(active) => {
            if (active === 'Overview')
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard label="Active families" value={activeFamilies} accent />
                  <SummaryCard label="Active nannies" value={activeNannies} />
                  <SummaryCard label="Quarterly revenue" value={money(revenue)} />
                  <SummaryCard label="Confirmed bookings" value={confirmed} />
                </div>
              )
            if (active === 'Platform health')
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SummaryCard label="Active families" value={activeFamilies} />
                  <SummaryCard label="Active nannies" value={activeNannies} />
                  <SummaryCard label="Family : nanny ratio" value={`1 : ${ratio}`} hint={`Target 1 : ${TARGET_RATIO}`} accent />
                </div>
              )
            if (active === 'Revenue')
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SummaryCard label="Quarterly revenue" value={money(revenue)} accent />
                  <SummaryCard label="MRR (subscriptions)" value={money((activeFamilies * SUBSCRIPTION) / 3)} />
                  <SummaryCard label="Avg revenue / family" value={money(activeFamilies ? revenue / activeFamilies : 0)} />
                </div>
              )
            if (active === 'Bookings')
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard label="Confirmed this quarter" value={confirmed} />
                  <SummaryCard label="Completion rate" value={`${completionRate}%`} accent />
                  <SummaryCard label="Unmatched" value={unmatched} hint="Rising = nanny shortage" />
                  <SummaryCard label="Recurring" value={recurring} />
                </div>
              )
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard label="Pending nanny apps" value={pendingNannies} />
                <SummaryCard label="Total families" value={families.length} />
                <SummaryCard label="Total nannies" value={nannies.length} />
              </div>
            )
          }}
        </Tabs>
      </PageBody>
    </>
  )
}

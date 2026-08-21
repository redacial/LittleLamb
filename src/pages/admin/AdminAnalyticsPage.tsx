import { useAllBookings, useUsersByRole, useBillingConfig } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'

const TARGET_RATIO = 4

/** Admin analytics — Overview / Platform Health / Revenue / Bookings / Growth (live where possible). */
export function AdminAnalyticsPage() {
  const { items: bookings, truncated: bookingsTruncated } = useAllBookings()
  const { users: families, truncated: familiesTruncated } = useUsersByRole('family')
  const { users: nannies, truncated: nanniesTruncated } = useUsersByRole('nanny')
  // Every figure below is derived by counting these arrays, so a capped read doesn't just
  // shorten a list — it makes revenue, ratios and rates silently WRONG (understated).
  // This page must say so rather than presenting a confident number it can't support.
  const partialData = bookingsTruncated || familiesTruncated || nanniesTruncated

  const activeFamilies = families.filter((f) => f.approved).length
  const activeNannies = nannies.filter((n) => n.approved).length
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length
  const unmatched = bookings.filter((b) => b.status === 'unmatched').length
  const recurring = bookings.filter((b) => b.recurring).length

  // Revenue was computed from hardcoded 25 / 1 while the server charges from config/billing,
  // so every figure here went stale the moment a price changed in Settings.
  // UNITS: config is CENTS (2500) — divide once, here; everything downstream is DOLLARS.
  const { config: rates, loading: ratesLoading } = useBillingConfig()
  const subscription = rates.subscriptionCents / 100
  const perBooking = rates.perBookingCents / 100
  const revenue = activeFamilies * subscription + confirmed * perBooking

  // Unlike the family page (which blanks entirely), only the money cards depend on the rate
  // config — counts and ratios are already correct. Show a dash for the money figures rather
  // than a confidently wrong dollar amount, and leave the rest of the dashboard usable.
  const dollars = (n: number) => (ratesLoading ? '—' : money(n))
  const ratio = activeFamilies > 0 ? (activeNannies / activeFamilies).toFixed(1) : 'n/a'
  const pendingNannies = nannies.filter((n) => n.status === 'pending').length
  const completionRate = confirmed + cancelled > 0 ? Math.round((confirmed / (confirmed + cancelled)) * 100) : 0

  return (
    <>
      <PageHeader title="Analytics" subtitle="Platform health at a glance." />
      <PageBody>
        {partialData && (
          <div
            role="alert"
            className="mb-4 rounded-ll-card border-1.5 border-ll-terra-deep bg-ll-terra-light p-4 text-ll-ink"
          >
            <p className="font-medium">These numbers are incomplete.</p>
            <p className="mt-1 text-sm text-ll-warm-gray">
              The platform now has more records than a single page can load, so every figure
              below is calculated from a recent subset and understates the true total. Treat
              them as indicative until reporting reads the full dataset.
            </p>
          </div>
        )}
        <Tabs tabs={['Overview', 'Platform health', 'Revenue', 'Bookings', 'Growth']}>
          {(active) => {
            if (active === 'Overview')
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard label="Active families" value={activeFamilies} accent />
                  <SummaryCard label="Active nannies" value={activeNannies} />
                  <SummaryCard label="Quarterly revenue" value={dollars(revenue)} />
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
                  <SummaryCard label="Quarterly revenue" value={dollars(revenue)} accent />
                  <SummaryCard label="MRR (subscriptions)" value={dollars((activeFamilies * subscription) / 3)} />
                  <SummaryCard label="Avg revenue / family" value={dollars(activeFamilies ? revenue / activeFamilies : 0)} />
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

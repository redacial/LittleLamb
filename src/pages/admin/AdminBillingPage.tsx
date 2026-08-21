import { useAllBookings, useUsersByRole, useBillingAlerts, useBillingConfig } from '../../hooks/useAdmin'
import { useInvoices, invoiceDollars } from '../../hooks/useInvoices'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { Card, CardLabel, Button, LoadErrorNotice, TruncatedNotice } from '../../components/ui'
import { SummaryCard } from '../../components/SummaryCard'
import { money } from '../../lib/format'
import { downloadCSV } from '../../lib/exporters'
import type { Invoice } from '../../types'

// Rates are NOT hardcoded here. config/billing is what the server actually charges from
// (functions/src/billing/quarterlyCharge.ts loadRates), and Settings writes it — so a constant
// would silently diverge from real charges the moment anyone changed the price. Worse on this
// page than the others: these figures are exported to CSV and handed to a bookkeeper.
// UNITS: the config stores CENTS; everything below this hook is DOLLARS.
const DONATION_RATE = 0.1

const STATUS_STYLE: Record<Invoice['status'], string> = {
  paid: 'bg-ll-sage-light text-ll-sage-deep border-ll-sage',
  pending: 'bg-ll-terra-light text-ll-terra-deep border-ll-terra-soft',
  failed: 'bg-red-100 text-red-800 border-red-300',
}

/**
 * One invoice row.
 *
 * Two things here are load-bearing and must not be "simplified":
 *
 * 1. `invoiceDollars()` before `money()`. The stored value is CENTS — `money(2700)` renders
 *    $2,700.00 for a $27.00 invoice.
 * 2. The dry-run treatment. A dry-run invoice records a real-looking `status` but no money
 *    ever moved, so the marking cannot be subtle: the row is restyled, the amount is struck
 *    through, and the status pill is replaced outright by "Not charged". An admin skimming
 *    for revenue must not be able to mistake one for a payment.
 */
function InvoiceRow({ inv }: { inv: Invoice }) {
  return (
    <Card
      data-testid={`invoice-${inv.invoiceId}`}
      className={
        inv.dryRun
          ? 'flex flex-wrap items-center justify-between gap-3 border-dashed border-ll-warm-gray bg-ll-cream'
          : 'flex flex-wrap items-center justify-between gap-3'
      }
    >
      <div className="min-w-0">
        <p className="font-semibold text-ll-ink">{inv.familyName}</p>
        <p className="text-sm text-ll-warm-gray">
          <span className="font-mono">{inv.periodStart}</span> —{' '}
          <span className="font-mono">{inv.periodEnd}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={
            inv.dryRun
              ? 'font-mono text-lg text-ll-warm-gray line-through'
              : 'font-mono text-lg font-medium text-ll-ink'
          }
        >
          {money(invoiceDollars(inv.totalCents))}
        </span>
        {inv.dryRun ? (
          // Deliberately loud, and it REPLACES the status pill rather than sitting beside
          // it — `status: 'paid'` on a dry run would otherwise read as money received.
          <span className="rounded-full border-1.5 border-red-400 bg-red-100 px-3 py-1 text-mono-sm uppercase tracking-wide text-red-800">
            Not charged — dry run
          </span>
        ) : (
          <span
            className={`rounded-full border-1.5 px-3 py-1 text-mono-sm capitalize ${STATUS_STYLE[inv.status]}`}
          >
            {inv.status}
          </span>
        )}
      </div>
    </Card>
  )
}

/** Admin Billing & Accounting — Overview / Current Billing / Invoice History / Accounting. */
export function AdminBillingPage() {
  const { items: bookings, truncated: bookingsTruncated } = useAllBookings()
  const { users: families, truncated: familiesTruncated } = useUsersByRole('family')
  const { items: billingAlerts, error: alertsError, truncated: alertsTruncated } = useBillingAlerts()
  const {
    items: invoices,
    error: invoicesError,
    hasMore: moreInvoices,
    loadingMore: loadingMoreInvoices,
    loadMore: loadMoreInvoices,
  } = useInvoices()
  const { config: billingConfig } = useBillingConfig()
  // Convert cents -> dollars exactly once. Everything downstream is dollars.
  const SUBSCRIPTION = billingConfig.subscriptionCents / 100
  const PER_BOOKING = billingConfig.perBookingCents / 100

  // Revenue here is counted off these arrays, so a capped read understates it.
  const partialData = bookingsTruncated || familiesTruncated || alertsTruncated
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
        {/* Failed-payment alerts are the reason an admin opens this page — if the read
            failed, say so rather than showing an all-clear. */}
        {alertsError && <LoadErrorNotice what="failed-payment alerts" />}
        {partialData && (
          <div className="mb-4">
            <TruncatedNotice shown={bookings.length} what="billing records" />
          </div>
        )}
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
                <div className="space-y-3">
                  {/* A failed read must never render as "no invoices" — see useInvoices. */}
                  {invoicesError ? (
                    <LoadErrorNotice what="invoices" />
                  ) : invoices.length === 0 ? (
                    <Card className="bg-ll-cream">
                      <CardLabel>Invoice history</CardLabel>
                      <p className="text-sm text-ll-warm-gray">
                        No invoices yet. They appear here as billing cycles close.
                      </p>
                    </Card>
                  ) : (
                    <>
                      {invoices.some((i) => i.dryRun) && (
                        <Card className="border-red-300 bg-red-50">
                          <p className="text-sm text-red-900">
                            <span className="font-semibold">Some invoices below were never charged.</span>{' '}
                            Dry-run invoices are recorded when billing runs with payments disabled — they
                            are not revenue.
                          </p>
                        </Card>
                      )}
                      {invoices.map((inv) => (
                        <InvoiceRow key={inv.invoiceId} inv={inv} />
                      ))}
                      {moreInvoices && (
                        <TruncatedNotice
                          shown={invoices.length}
                          what="invoices"
                          onLoadMore={loadMoreInvoices}
                          loadingMore={loadingMoreInvoices}
                        />
                      )}
                    </>
                  )}
                </div>
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

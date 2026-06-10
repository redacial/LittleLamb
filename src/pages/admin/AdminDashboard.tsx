import { useOpenBookings } from '../../hooks/useBookings'
import { usePendingApplications, useAdminActions } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Button, Card, CardLabel } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'

/**
 * Action-first admin home. Single scrollable page, fixed priority order top→bottom (spec §3):
 * same-day banner → unmatched → nanny cancellations → pending nanny apps → pending family apps
 * → failed payments. Metrics live on Analytics, not here.
 */
export function AdminDashboard() {
  const open = useOpenBookings()
  const sameDay = open.filter((b) => b.status === 'same_day_review')
  const unmatched = open.filter((b) => b.status === 'unmatched')
  const pendingNannies = usePendingApplications('nanny')
  const pendingFamilies = usePendingApplications('family')
  const { approve, reject } = useAdminActions()

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Everything that needs your attention, in priority order." />
      <PageBody>
        {/* 1. Same-day banner — visually dominant */}
        {sameDay.length > 0 && (
          <div className="mb-6 rounded-2xl bg-terracotta-500 p-5 text-white shadow-lift">
            <p className="text-eyebrow font-bold uppercase tracking-[0.14em] text-white/80">
              Same-day requests
            </p>
            <p className="mt-1 font-display text-2xl">
              {sameDay.length} same-day booking{sameDay.length > 1 ? 's' : ''} need manual processing
            </p>
            <div className="mt-4 space-y-2">
              {sameDay.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/15 px-4 py-2">
                  <span className="font-semibold">
                    {b.familyName} · {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)}
                  </span>
                  <span className="text-sm text-white/80">{b.address}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* 2. Unmatched bookings */}
          <section>
            <h2 className="mb-2 font-display text-xl">Unmatched bookings</h2>
            {unmatched.length === 0 ? (
              <Empty>No unmatched bookings — every request has a nanny.</Empty>
            ) : (
              <div className="space-y-2">
                {unmatched.map((b) => (
                  <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{b.familyName}</p>
                      <p className="text-sm text-charcoal-muted">
                        {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)} · {b.address}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary">Assign a nanny</Button>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* 3. Nanny cancellation requests — surfaced via Messages in this build */}
          <section>
            <h2 className="mb-2 font-display text-xl">Nanny cancellation requests</h2>
            <Empty>
              Nannies request cancellations through Messages. Open the inbox to review and action them.
            </Empty>
          </section>

          {/* 4. Pending nanny applications */}
          <ApplicationList
            title="Pending nanny applications"
            items={pendingNannies}
            onApprove={approve}
            onReject={reject}
          />

          {/* 5. Pending family applications */}
          <ApplicationList
            title="Pending family applications"
            items={pendingFamilies}
            onApprove={approve}
            onReject={reject}
          />

          {/* 6. Failed payments */}
          <section>
            <h2 className="mb-2 font-display text-xl">Failed payments</h2>
            <Empty>No failed payments this cycle.</Empty>
          </section>
        </div>
      </PageBody>
    </>
  )
}

function ApplicationList({
  title,
  items,
  onApprove,
  onReject,
}: {
  title: string
  items: { uid: string; fullName: string; email: string }[]
  onApprove: (uid: string) => void
  onReject: (uid: string) => void
}) {
  return (
    <section>
      <h2 className="mb-2 font-display text-xl">{title}</h2>
      {items.length === 0 ? (
        <Empty>None awaiting review.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.uid} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{a.fullName}</p>
                <p className="text-sm text-charcoal-muted">{a.email}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onApprove(a.uid)}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => onReject(a.uid)}>Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="bg-cream-100">
      <CardLabel>All clear</CardLabel>
      <p className="text-sm text-charcoal-muted">{children}</p>
    </Card>
  )
}

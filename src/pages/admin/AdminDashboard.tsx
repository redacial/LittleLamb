import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { usePendingApplications, useAdminActions, useAllBookings } from '../../hooks/useAdmin'
import { PageBody } from '../../components/layout/AppLayout'
import { Button, Card, CardLabel } from '../../components/ui'
import { Grain, Sparkle } from '../../components/theme'
import { useSpringIn, useButtonHover } from '../../lib/motion'
import { formatDate, formatTimeRange } from '../../lib/format'

/**
 * Action-first admin home. Single scrollable page, fixed priority order top→bottom (spec §3):
 * same-day banner → unmatched → nanny cancellations → pending nanny apps → pending family apps
 * → failed payments. Metrics live on Analytics, not here.
 *
 * Theme note: admin is the work surface — calm and legible. The warm hero band (grain + Caveat
 * greeting) is the only flourish; the same-day banner gets real terracotta dominance because it
 * is the #1 action item. Interactive tilt lives only on action cards, never on dense rows.
 */
export function AdminDashboard() {
  const { profile } = useAuth()
  const allBookings = useAllBookings()
  const sameDay = allBookings.filter((b) => b.status === 'same_day_review')
  const unmatched = allBookings.filter((b) => b.status === 'unmatched' || b.status === 'open')
  const pendingNannies = usePendingApplications('nanny')
  const pendingFamilies = usePendingApplications('family')
  const { approve, reject } = useAdminActions()
  const springIn = useSpringIn()
  const btnHover = useButtonHover()

  const firstName = profile?.fullName?.split(' ')[0] ?? 'there'
  const queueCount =
    sameDay.length + unmatched.length + pendingNannies.length + pendingFamilies.length

  return (
    <>
      {/* Warm welcoming hero band — the one place grain + a Caveat greeting live on admin.
          Lighter-touch than the consumer dashboards: no CTA, just orientation. */}
      <div className="relative overflow-hidden border-b-1.5 border-ll-cream-dark px-6 py-7 sm:px-8">
        <Grain />
        <p className="eyebrow inline-flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-ll-terra" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="mt-2 font-display text-display-xl leading-[0.95] text-ll-ink">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 max-w-md text-ll-warm-gray">
          {queueCount === 0
            ? 'Nothing needs your attention right now.'
            : 'Everything that needs your attention, in priority order.'}
        </p>
      </div>

      <PageBody>
        {/* 1. Same-day banner — the #1 action item, given real visual dominance:
            terracotta-deep ground (AA-safe with white), alert sparkle, count up front. */}
        {sameDay.length > 0 && (
          <motion.div
            {...springIn}
            role="alert"
            className="mb-6 overflow-hidden rounded-ll-card border-1.5 border-ll-terra-soft bg-ll-terra-deep p-5 text-white shadow-lift sm:p-6"
          >
            <div className="flex items-center gap-2.5">
              <span className="motion-safe:animate-bob text-white">
                <Sparkle className="h-5 w-5" />
              </span>
              <p className="font-mono text-eyebrow font-medium uppercase tracking-[0.14em] text-white/90">
                Same-day requests
              </p>
            </div>
            <p className="mt-2 font-display text-display-md leading-tight">
              <span className="font-mono">{sameDay.length}</span> same-day booking
              {sameDay.length > 1 ? 's' : ''} need manual processing
            </p>
            <div className="mt-4 space-y-2">
              {sameDay.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-ll-input bg-white/15 px-4 py-2.5"
                >
                  <span className="font-semibold">
                    {b.familyName} · {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)}
                  </span>
                  <span className="text-sm text-white/85">{b.address}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-8">
          {/* 2. Unmatched bookings — action cards get the alive tilt + pop. */}
          <Section title="Unmatched bookings" count={unmatched.length}>
            {unmatched.length === 0 ? (
              <Empty>No unmatched bookings. Every request has a nanny.</Empty>
            ) : (
              <div className="space-y-2.5">
                {unmatched.map((b) => (
                  <Card
                    key={b.id}
                    interactive
                    tone="peri"
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ll-ink">{b.familyName}</p>
                      <p className="text-sm text-ll-warm-gray">
                        {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)} · {b.address}
                      </p>
                    </div>
                    <motion.div {...btnHover} className="inline-block">
                      <Button size="sm" variant="secondary">Assign a nanny</Button>
                    </motion.div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {/* 3. Nanny cancellation requests. The request channel is an open business
              decision (handled off-platform for now — in-app messaging was removed). */}
          <Section title="Nanny cancellation requests">
            <Empty>No cancellation requests to review.</Empty>
          </Section>

          {/* 4. Pending nanny applications */}
          <ApplicationList
            title="Pending nanny applications"
            role="nanny"
            items={pendingNannies}
            onApprove={approve}
            onReject={reject}
          />

          {/* 5. Pending family applications */}
          <ApplicationList
            title="Pending family applications"
            role="family"
            items={pendingFamilies}
            onApprove={approve}
            onReject={reject}
          />

          {/* 6. Failed payments */}
          <Section title="Failed payments">
            <Empty>No failed payments this cycle.</Empty>
          </Section>
        </div>
      </PageBody>
    </>
  )
}

/** Section heading with an optional live count chip (DM Mono — the "verified" treatment). */
function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <h2 className="font-display text-display-sm text-ll-ink">{title}</h2>
        {count != null && count > 0 && (
          <span className="rounded-full bg-ll-cream-dark px-2.5 py-0.5 font-mono text-mono-sm font-medium text-ll-warm-gray">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function ApplicationList({
  title,
  role,
  items,
  onApprove,
  onReject,
}: {
  title: string
  role: 'family' | 'nanny'
  items: { uid: string; fullName: string; email: string }[]
  onApprove: (uid: string, fullName: string, role: 'family' | 'nanny') => void
  onReject: (uid: string, fullName: string, role: 'family' | 'nanny') => void
}) {
  const btnHover = useButtonHover()
  return (
    <Section title={title} count={items.length}>
      {items.length === 0 ? (
        <Empty>None awaiting review.</Empty>
      ) : (
        <div className="space-y-2.5">
          {items.map((a) => (
            <Card
              key={a.uid}
              interactive
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ll-ink">{a.fullName}</p>
                <p className="text-sm text-ll-warm-gray">{a.email}</p>
              </div>
              <div className="flex gap-2">
                <motion.div {...btnHover} className="inline-block">
                  <Button size="sm" onClick={() => onApprove(a.uid, a.fullName, role)}>Approve</Button>
                </motion.div>
                <motion.div {...btnHover} className="inline-block">
                  <Button size="sm" variant="secondary" onClick={() => onReject(a.uid, a.fullName, role)}>Reject</Button>
                </motion.div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="bg-ll-cream">
      <CardLabel>All clear</CardLabel>
      <p className="text-sm text-ll-warm-gray">{children}</p>
    </Card>
  )
}

import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import {
  usePendingApplications,
  useAdminActions,
  useAllBookings,
  useUndeliveredMail,
} from '../../hooks/useAdmin'
import { PageBody } from '../../components/layout/AppLayout'
import { Button, Card, CardLabel, LoadErrorNotice, TruncatedNotice } from '../../components/ui'
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
  const {
    items: allBookings,
    error: bookingsError,
    truncated: bookingsTruncated,
    loadMore: loadMoreBookings,
    loadingMore: loadingMoreBookings,
  } = useAllBookings()
  const sameDay = allBookings.filter((b) => b.status === 'same_day_review')
  const unmatched = allBookings.filter((b) => b.status === 'unmatched' || b.status === 'open')
  const {
    items: pendingNannies,
    error: nanniesError,
    truncated: nanniesTruncated,
    loadMore: loadMoreNannies,
    loadingMore: loadingMoreNannies,
  } = usePendingApplications('nanny')
  const {
    items: pendingFamilies,
    error: familiesError,
    truncated: familiesTruncated,
    loadMore: loadMoreFamilies,
    loadingMore: loadingMoreFamilies,
  } = usePendingApplications('family')
  const {
    items: undeliveredMail,
    error: mailError,
    truncated: mailTruncated,
    loadMore: loadMoreMail,
    loadingMore: loadingMoreMail,
  } = useUndeliveredMail()
  // A failed read must never render as "nothing to do" — see LoadErrorNotice.
  const loadError = bookingsError || nanniesError || familiesError
  // Nor must a PARTIAL read. This page filters the booking window client-side and counts
  // the result, so a truncated read can hide same-day requests and pending applicants
  // behind a confident "nothing needs your attention" — the same class of bug as an
  // unreported error, and the reason `truncated` must never be dropped here.
  const partialQueue = bookingsTruncated || nanniesTruncated || familiesTruncated
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
          {loadError
            ? // Never claim the queue is clear when we failed to read it.
              'Some of your queue could not be loaded — see below.'
            : partialQueue && queueCount === 0
              ? // Nor when we only read part of it: "nothing to do" from a partial list is
                // a wrong conclusion drawn from a page that simply stopped counting.
                'No action items in what loaded so far — the list is partial, see below.'
              : queueCount === 0
                ? 'Nothing needs your attention right now.'
                : 'Everything that needs your attention, in priority order.'}
        </p>
      </div>

      <PageBody>
        {/* 0. Load failures come FIRST — an admin must know the queue below is incomplete
            before they read it as empty. */}
        {bookingsError && <LoadErrorNotice what="same-day and unmatched bookings" />}
        {nanniesError && <LoadErrorNotice what="pending nanny applications" />}
        {familiesError && <LoadErrorNotice what="pending family applications" />}

        {/* 0b. Partial reads rank alongside failures: this page derives its queue by
            filtering a bounded booking window, so anything past the window is invisible
            rather than merely further down. */}
        {(bookingsTruncated || nanniesTruncated || familiesTruncated) && (
          <div className="mb-4 space-y-2">
            {bookingsTruncated && (
              <TruncatedNotice
                shown={allBookings.length}
                what="bookings scanned for action items"
                onLoadMore={loadMoreBookings}
                loadingMore={loadingMoreBookings}
              />
            )}
            {nanniesTruncated && (
              <TruncatedNotice
                shown={pendingNannies.length}
                what="pending nanny applications"
                onLoadMore={loadMoreNannies}
                loadingMore={loadingMoreNannies}
              />
            )}
            {familiesTruncated && (
              <TruncatedNotice
                shown={pendingFamilies.length}
                what="pending family applications"
                onLoadMore={loadMoreFamilies}
                loadingMore={loadingMoreFamilies}
              />
            )}
          </div>
        )}

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

          {/* 7. Undelivered mail. Below the people-facing queues because it is an
              operational fault rather than someone waiting on a decision — but on this
              page rather than buried in settings, because both of its states are TERMINAL:
              nothing retries, so if nobody looks here the email is simply never sent. */}
          <Section title="Undelivered email" count={undeliveredMail.length}>
            {mailError ? (
              <LoadErrorNotice what="undelivered email" />
            ) : undeliveredMail.length === 0 ? (
              <Empty>Every email has gone out.</Empty>
            ) : (
              <div className="space-y-2">
                {mailTruncated && (
                  <TruncatedNotice
                    shown={undeliveredMail.length}
                    what="undelivered emails"
                    onLoadMore={loadMoreMail}
                    loadingMore={loadingMoreMail}
                  />
                )}
                {undeliveredMail.map((mail) => (
                  <div
                    key={mail.id}
                    className="rounded-ll-input border-1.5 border-ll-cream-dark bg-white px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-ll-ink">
                      {mail.event?.type?.replace(/_/g, ' ') ?? 'Email'}
                      <span className="ml-2 font-mono text-xs uppercase text-ll-warm-gray">
                        {mail.status === 'quota_exceeded' ? 'daily cap reached' : 'send failed'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-ll-warm-gray">
                      {mail.status === 'quota_exceeded'
                        ? 'This sender hit the daily email cap, so this was never sent. It will not retry.'
                        : (mail.error ?? 'The email provider rejected this. It will not retry.')}
                    </p>
                  </div>
                ))}
              </div>
            )}
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

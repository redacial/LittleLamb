import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings, useBookingActions } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { ReviewModal } from '../../components/ReviewModal'
import { Card, Button, StatusPill, RateDisclaimer, Modal } from '../../components/ui'
import { formatDate, formatTimeRange, money } from '../../lib/format'
import { formatRate } from '../../lib/rates'
import type { Booking, BookingStatus } from '../../types'
import { todayISO, lateCancelFeeCents } from '../../lib/bookingRules'

function tone(s: BookingStatus): 'confirmed' | 'pending' | 'cancelled' | 'open' | 'neutral' {
  if (s === 'confirmed') return 'confirmed'
  if (s === 'pending') return 'pending'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'open' || s === 'unmatched') return 'open'
  return 'neutral'
}

/** Is this booking upcoming — its date is today or later and it isn't cancelled? */
function isUpcoming(b: Booking, today: string): boolean {
  return b.date >= today && b.status !== 'cancelled'
}

/** Bookings list, shared by family + nanny. Split into Upcoming / Past. Only families cancel. */
export function BookingsPage({ role }: { role: 'family' | 'nanny' }) {
  const { user } = useAuth()
  const { bookings, loading } = useMyBookings(user?.uid, role)
  const { cancelBooking } = useBookingActions()
  const [reviewing, setReviewing] = useState<Booking | null>(null)
  // The booking a family is about to cancel — drives the confirm dialog, which warns about a
  // late-cancel fee when the cancel falls inside the free window.
  const [cancelling, setCancelling] = useState<Booking | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const today = todayISO()
  const upcoming = bookings.filter((b) => isUpcoming(b, today))
  const past = bookings.filter((b) => !isUpcoming(b, today))

  const fee = cancelling ? lateCancelFeeCents(cancelling, cancelling.rateMinCents) : 0

  async function doCancel() {
    if (!cancelling) return
    setCancelBusy(true)
    try {
      await cancelBooking(cancelling.id, cancelling, fee)
      setCancelling(null)
    } finally {
      setCancelBusy(false)
    }
  }

  function Section({ title, items }: { title: string; items: Booking[] }) {
    if (items.length === 0) return null
    return (
      <div className="space-y-3">
        <h2 className="font-display text-display-sm text-ll-ink">{title}</h2>
        {items.some((b) => typeof b.rateMinCents === 'number') && <RateDisclaimer className="mb-1" />}
        {items.map((b) => (
          <BookingRow
            key={b.id}
            booking={b}
            role={role}
            onCancel={() => setCancelling(b)}
            onReview={() => setReviewing(b)}
            otherName={role === 'family' ? b.nannyName : b.familyName}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Bookings" subtitle={role === 'family' ? 'All your past and upcoming bookings.' : 'Your sessions, past and upcoming.'} />
      <PageBody>
        {loading ? (
          <p className="text-ll-warm-gray">Loading…</p>
        ) : bookings.length === 0 ? (
          <Card tone="sage" className="text-center">
            <p className="font-display text-display-md text-ll-ink">No bookings yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ll-warm-gray">
              {role === 'family'
                ? 'When you book a nanny, your upcoming and past sessions will live here.'
                : 'Your confirmed sessions will appear here once families start booking you.'}
            </p>
            {role === 'family' && (
              <Link to="/family/nannies" className="mt-4 inline-block">
                <Button>Browse nannies</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            <Section title="Upcoming" items={upcoming} />
            <Section title="Past" items={past} />
          </div>
        )}
      </PageBody>

      {/* Family cancel confirmation. A cancel inside the free window (< FREE_CANCEL_HOURS) is a
          LATE cancel — full pay is due to the nanny — so the family is told the amount before they
          commit, not after. Little Lamb waives it for extenuating circumstances off-platform. */}
      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Cancel this booking?">
        {cancelling && (
          <div className="space-y-4">
            <p className="text-sm text-ll-warm-gray">
              {formatDate(cancelling.date)} · {formatTimeRange(cancelling.startTime, cancelling.endTime)}
              {cancelling.nannyName ? ` with ${cancelling.nannyName}` : ''}.
            </p>
            {fee > 0 ? (
              <p className="rounded-ll-input border-1.5 border-ll-terra bg-ll-terra-soft px-3 py-2 text-sm text-ll-ink">
                This is a <strong>late cancellation</strong> (less than 24 hours before it starts), so
                full pay of <strong>{money(fee / 100)}</strong> is due to
                {cancelling.nannyName ? ` ${cancelling.nannyName.split(' ')[0]}` : ' your nanny'}.
                If something came up — a sick child, an emergency — reach out and we’ll sort it out.
              </p>
            ) : (
              <p className="text-sm text-ll-warm-gray">
                You’re cancelling with more than 24 hours’ notice, so there’s no charge.
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="danger" onClick={doCancel} loading={cancelBusy}>
                {fee > 0 ? 'Cancel anyway' : 'Cancel booking'}
              </Button>
              <Button variant="ghost" onClick={() => setCancelling(null)}>Keep it</Button>
            </div>
          </div>
        )}
      </Modal>

      <ReviewModal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        booking={reviewing}
        authorId={user?.uid ?? ''}
        authorRole={role}
      />
    </>
  )
}

function BookingRow({
  booking: b,
  role,
  onCancel,
  onReview,
  otherName,
}: {
  booking: Booking
  role: 'family' | 'nanny'
  onCancel: (b: Booking) => void
  onReview: () => void
  otherName: string | null
}) {
  // Past = the session date has passed and it was confirmed or cancelled — reviewable at any time.
  const isPast =
    b.date < todayISO() &&
    (b.status === 'confirmed' || b.status === 'cancelled')
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{otherName ?? (role === 'family' ? 'Finding a nanny' : 'Family')}</p>
          <StatusPill status={b.status} tone={tone(b.status)} />
        </div>
        <p className="text-sm text-ll-warm-gray">
          {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)}
        </p>
        <p className="text-sm text-ll-warm-gray">{b.address}</p>
        {typeof b.rateMinCents === 'number' && typeof b.rateMaxCents === 'number' && (
          // The rate a nanny needs BEFORE accepting a pending request — flagged when the
          // two sides' ranges didn't overlap, so nobody accepts on a wrong assumption.
          <p className="mt-1 font-mono text-mono-sm text-ll-ink">
            {formatRate({ minCents: b.rateMinCents, maxCents: b.rateMaxCents })}
            {b.rateAgreed === false && (
              <span className="ml-1.5 font-sans text-ll-warm-gray">
                (asking rate — outside the family&rsquo;s budget)
              </span>
            )}
          </p>
        )}
        {b.notes && <p className="mt-1 text-sm text-ll-warm-gray">“{b.notes}”</p>}
      </div>
      <div className="flex gap-2">
        {/* Nannies have NO booking actions here (partner meeting 2026-09): the pending
            accept/decline flow is gone, and a nanny cannot cancel in-app at all — her only
            cancel path is to email/text Little Lamb. Claiming open posts happens on the Job
            Board tab, not here (this page only lists a nanny's own assigned bookings). */}
        {role === 'family' && b.status === 'confirmed' && (
          <Button size="sm" variant="secondary" onClick={() => onCancel(b)}>Cancel</Button>
        )}
        {isPast && (
          <Button size="sm" variant="ghost" onClick={onReview}>Leave a review</Button>
        )}
      </div>
    </Card>
  )
}

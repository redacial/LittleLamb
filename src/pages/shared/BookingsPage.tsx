import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings, useBookingActions, type BookingActor } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { ReviewModal } from '../../components/ReviewModal'
import { Card, Button, StatusPill, RateDisclaimer } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import { formatRate } from '../../lib/rates'
import type { Booking, BookingStatus } from '../../types'
import { todayISO } from '../../lib/bookingRules'

/**
 * The booking fields every notification email needs to address and describe itself. Mirrors the
 * hook-private BookingMeta in useBookings.ts — same Pick over Booking, so a Booking satisfies it
 * structurally and callers pass the booking straight through.
 */
type BookingMeta = Pick<
  Booking,
  'familyId' | 'familyName' | 'nannyId' | 'nannyName' | 'date' | 'startTime' | 'endTime' | 'address'
>

function tone(s: BookingStatus): 'confirmed' | 'pending' | 'cancelled' | 'open' | 'neutral' {
  if (s === 'confirmed') return 'confirmed'
  if (s === 'pending') return 'pending'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'open' || s === 'unmatched') return 'open'
  return 'neutral'
}

/** Bookings list, shared by family + nanny. Family can cancel; nanny can accept/decline pending. */
export function BookingsPage({ role }: { role: 'family' | 'nanny' }) {
  const { user } = useAuth()
  const { bookings, loading } = useMyBookings(user?.uid, role)
  const { setStatus } = useBookingActions()
  const [reviewing, setReviewing] = useState<Booking | null>(null)

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
          <div className="space-y-3">
            {bookings.some((b) => typeof b.rateMinCents === 'number') && (
              <RateDisclaimer className="mb-1" />
            )}
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                role={role}
                onAction={setStatus}
                onReview={() => setReviewing(b)}
                otherName={role === 'family' ? b.nannyName : b.familyName}
              />
            ))}
          </div>
        )}
      </PageBody>

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
  onAction,
  onReview,
  otherName,
}: {
  booking: Booking
  role: 'family' | 'nanny'
  // Must mirror useBookingActions().setStatus. A narrower 2-param type here erased meta/actor
  // at the type level, which is what kept these three buttons silently emailing nobody.
  onAction: (id: string, s: BookingStatus, meta?: BookingMeta, actor?: BookingActor) => void
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
        {role === 'nanny' && b.status === 'pending' && (
          <>
            {/* Both guarded by role === 'nanny' above, so the actor is known statically here. */}
            <Button size="sm" onClick={() => onAction(b.id, 'confirmed', b, 'nanny')}>Accept</Button>
            {/* 'nanny' routes this to booking_request_declined → the FAMILY, who has to rebook.
                Letting it default to 'family' emails the nanny about her own decline. */}
            <Button size="sm" variant="secondary" onClick={() => onAction(b.id, 'cancelled', b, 'nanny')}>Decline</Button>
          </>
        )}
        {role === 'family' && (b.status === 'confirmed' || b.status === 'pending') && (
          <Button size="sm" variant="secondary" onClick={() => onAction(b.id, 'cancelled', b, 'family')}>Cancel</Button>
        )}
        {isPast && (
          <Button size="sm" variant="ghost" onClick={onReview}>Leave a review</Button>
        )}
      </div>
    </Card>
  )
}

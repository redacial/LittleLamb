import { useAuth } from '../../context/AuthContext'
import { useMyBookings, useBookingActions } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, Button, StatusPill } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import type { Booking, BookingStatus } from '../../types'

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

  return (
    <>
      <PageHeader title="Bookings" subtitle={role === 'family' ? 'All your past and upcoming bookings.' : 'Your sessions, past and upcoming.'} />
      <PageBody>
        {loading ? (
          <p className="text-charcoal-muted">Loading…</p>
        ) : bookings.length === 0 ? (
          <Card className="bg-cream-100"><p className="text-sm text-charcoal-muted">No bookings yet.</p></Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <BookingRow key={b.id} booking={b} role={role} onAction={setStatus} otherName={role === 'family' ? b.nannyName : b.familyName} />
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}

function BookingRow({
  booking: b,
  role,
  onAction,
  otherName,
}: {
  booking: Booking
  role: 'family' | 'nanny'
  onAction: (id: string, s: BookingStatus) => void
  otherName: string | null
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{otherName ?? (role === 'family' ? 'Finding a nanny' : 'Family')}</p>
          <StatusPill status={b.status} tone={tone(b.status)} />
        </div>
        <p className="text-sm text-charcoal-muted">
          {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)}
        </p>
        <p className="text-sm text-charcoal-muted">{b.address}</p>
        {b.notes && <p className="mt-1 text-sm text-charcoal-muted">“{b.notes}”</p>}
      </div>
      <div className="flex gap-2">
        {role === 'nanny' && b.status === 'pending' && (
          <>
            <Button size="sm" onClick={() => onAction(b.id, 'confirmed')}>Accept</Button>
            <Button size="sm" variant="secondary" onClick={() => onAction(b.id, 'cancelled')}>Decline</Button>
          </>
        )}
        {role === 'family' && (b.status === 'confirmed' || b.status === 'pending') && (
          <Button size="sm" variant="secondary" onClick={() => onAction(b.id, 'cancelled')}>Cancel</Button>
        )}
      </div>
    </Card>
  )
}

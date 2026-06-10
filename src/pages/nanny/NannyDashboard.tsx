import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings, useOpenBookings, useBookingActions } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { SummaryCard } from '../../components/SummaryCard'
import { Button, Card, CardLabel } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'

export function NannyDashboard() {
  const { profile, user } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'nanny')
  const open = useOpenBookings()
  const { setStatus, assignNanny } = useBookingActions()

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = bookings
    .filter((b) => b.status === 'confirmed' && b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const next = upcoming[0]
  const pending = bookings.filter((b) => b.status === 'pending')

  return (
    <>
      <PageHeader
        title={`Hi, ${profile?.fullName?.split(' ')[0] ?? 'there'}`}
        subtitle="Your bookings and open requests."
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Next booking"
            value={next ? formatDate(next.date) : '—'}
            hint={next ? `${next.familyName} · ${formatTimeRange(next.startTime, next.endTime)}` : 'None scheduled'}
            accent
          />
          <SummaryCard label="Pending requests" value={pending.length} hint="Awaiting your reply" />
          <SummaryCard label="Open bookings" value={open.length} hint="Requests you can pick up" />
          <SummaryCard label="Confirmed" value={upcoming.length} hint="Upcoming this period" />
        </div>

        {pending.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-display text-xl">Requests awaiting your reply</h2>
            {pending.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.familyName}</p>
                  <p className="text-sm text-charcoal-muted">
                    {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setStatus(b.id, 'confirmed')}>Accept</Button>
                  <Button size="sm" variant="secondary" onClick={() => setStatus(b.id, 'cancelled')}>Decline</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {open.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-display text-xl">Open bookings you can pick up</h2>
            {open.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.familyName}</p>
                  <p className="text-sm text-charcoal-muted">
                    {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)} · {b.address}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => user && profile && assignNanny(b.id, user.uid, profile.fullName)}
                >
                  Accept this booking
                </Button>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-6">
          <CardLabel>Messages</CardLabel>
          <Link to="/nanny/messages" className="mt-2 inline-block text-sm font-bold text-sage-600 hover:underline">
            Open messages →
          </Link>
        </Card>
      </PageBody>
    </>
  )
}

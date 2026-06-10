import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { SummaryCard } from '../../components/SummaryCard'
import { ReviewModal } from '../../components/ReviewModal'
import { Button, Card, CardLabel, StatusPill } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import type { Booking } from '../../types'

function isUpcoming(b: Booking) {
  return b.status !== 'cancelled' && b.date >= new Date().toISOString().slice(0, 10)
}

export function FamilyDashboard() {
  const { profile, user } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'family')
  const [reviewing, setReviewing] = useState<Booking | null>(null)

  const upcoming = bookings.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date))
  const next = upcoming[0]
  const thisQuarter = bookings.filter((b) => b.status === 'confirmed').length
  // Review prompts: confirmed bookings whose date has passed.
  const today = new Date().toISOString().slice(0, 10)
  const toReview = bookings.filter((b) => b.status === 'confirmed' && b.date < today).slice(0, 3)

  return (
    <>
      <PageHeader
        title={`Hello, ${profile?.fullName?.split(' ')[0] ?? 'there'}`}
        subtitle="Here’s your childcare at a glance."
        action={
          <Link to="/family/calendar">
            <Button>Book a nanny</Button>
          </Link>
        }
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            label="Next booking"
            value={next ? formatDate(next.date) : '—'}
            hint={
              next
                ? `${next.nannyName ?? 'Awaiting nanny'} · ${formatTimeRange(next.startTime, next.endTime)}`
                : 'No upcoming bookings yet'
            }
            accent
          />
          <SummaryCard label="Bookings this quarter" value={thisQuarter} hint="Counts toward your quarterly bill" />
        </div>

        {toReview.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-display text-xl">How did it go?</h2>
            {toReview.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.nannyName}</p>
                  <p className="text-sm text-charcoal-muted">{formatDate(b.date)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setReviewing(b)}>Leave a review</Button>
                  <Button size="sm" variant="ghost">Skip</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardLabel>Upcoming</CardLabel>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-charcoal-muted">
                Nothing booked yet. Tap “Book a nanny” to find someone for your next date.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-charcoal/5">
                {upcoming.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-semibold">{b.nannyName ?? 'Finding a nanny'}</p>
                      <p className="text-sm text-charcoal-muted">
                        {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)}
                      </p>
                    </div>
                    <StatusPill
                      status={b.status}
                      tone={b.status === 'confirmed' ? 'confirmed' : b.status === 'pending' ? 'pending' : 'neutral'}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardLabel>Messages</CardLabel>
            <p className="mt-2 text-sm text-charcoal-muted">
              Your latest conversations with the Little Lamb team and your nannies.
            </p>
            <Link to="/family/messages" className="mt-3 inline-block text-sm font-bold text-sage-600 hover:underline">
              Open messages →
            </Link>
          </Card>
        </div>
      </PageBody>

      <ReviewModal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        booking={reviewing}
        authorId={user?.uid ?? ''}
        authorRole="family"
      />
    </>
  )
}

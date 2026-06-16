import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings } from '../../hooks/useBookings'
import { PageBody } from '../../components/layout/AppLayout'
import { SummaryCard } from '../../components/SummaryCard'
import { ReviewModal } from '../../components/ReviewModal'
import { Button, Card, CardLabel, StatusPill } from '../../components/ui'
import { Grain, Sparkle } from '../../components/theme'
import { useButtonHover } from '../../lib/motion'
import { formatDate, formatTimeRange } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Booking } from '../../types'

function isUpcoming(b: Booking) {
  return b.status !== 'cancelled' && b.date >= new Date().toISOString().slice(0, 10)
}

export function FamilyDashboard() {
  const { profile, user } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'family')
  const [reviewing, setReviewing] = useState<Booking | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const btnHover = useButtonHover()

  // Family names are often "The Hartley Family" — greeting "The" reads wrong, so strip a
  // leading "The" and greet by the meaningful name; fall back to the first word otherwise.
  const greetName = (() => {
    const full = profile?.fullName?.trim()
    if (!full) return 'there'
    const withoutThe = full.replace(/^the\s+/i, '')
    if (/family$/i.test(withoutThe)) return withoutThe // "Hartley Family"
    return withoutThe.split(' ')[0] // first name
  })()
  const upcoming = bookings.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date))
  const next = upcoming[0]
  const thisQuarter = bookings.filter((b) => b.status === 'confirmed').length
  // Review prompts: confirmed bookings whose date has passed.
  const today = new Date().toISOString().slice(0, 10)
  const toReview = bookings
    .filter((b) => b.status === 'confirmed' && b.date < today && !skipped.has(b.id))
    .slice(0, 3)

  return (
    <>
      {/* Warm welcoming dashboard hero — the one place grain + display greeting live. */}
      <div className="relative overflow-hidden border-b-1.5 border-ll-cream-dark px-6 py-7 sm:px-8">
        <Grain />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow inline-flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-ll-terra" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="mt-2 font-display text-display-xl leading-[0.95] text-ll-ink">
              Hello, {greetName}
            </h1>
            <p className="mt-1 max-w-md text-ll-warm-gray">
              Here is your childcare at a glance.
            </p>
          </div>
          <motion.div {...btnHover} className="inline-block">
            <Link to="/family/calendar">
              <Button>Book a nanny</Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            label="Next booking"
            value={next ? formatDate(next.date) : 'None yet'}
            hint={
              next
                ? `${next.nannyName ?? 'Awaiting nanny'} · ${formatTimeRange(next.startTime, next.endTime)}`
                : 'No upcoming bookings yet'
            }
            accent
          />
          <SummaryCard
            label="Bookings this quarter"
            value={thisQuarter}
            hint="Counts toward your quarterly bill"
          />
        </div>

        {toReview.length > 0 && (
          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-ll-sage-mid" />
              <h2 className="font-display text-display-sm text-ll-ink">How did it go?</h2>
            </div>
            {toReview.map((b) => (
              <Card
                key={b.id}
                tone="peri"
                interactive
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-display-sm leading-none text-ll-ink">{b.nannyName}</p>
                  <p className="mt-1 font-mono text-mono-sm text-ll-warm-gray">{formatDate(b.date)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setReviewing(b)}>
                    Leave a review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSkipped((s) => new Set(s).add(b.id))}
                  >
                    Skip
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardLabel>Upcoming</CardLabel>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-ll-warm-gray">
                Nothing booked yet. Tap "Book a nanny" to find someone for your next date.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-ll-cream-dark">
                {upcoming.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ll-ink">
                        {b.nannyName ?? 'Finding a nanny'}
                      </p>
                      <p className="text-sm text-ll-warm-gray">
                        {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)}
                      </p>
                    </div>
                    <StatusPill
                      status={b.status}
                      tone={
                        b.status === 'confirmed'
                          ? 'confirmed'
                          : b.status === 'pending'
                            ? 'pending'
                            : 'neutral'
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card interactive tone="peri" as="section">
            <CardLabel>Messages</CardLabel>
            <p className="mt-2 text-sm text-ll-warm-gray">
              Your latest conversations with the Little Lamb team and your nannies.
            </p>
            <Link
              to="/family/messages"
              className={cn(
                'mt-3 inline-flex items-center gap-1 rounded-full font-medium text-ll-peri-ink',
                'underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-peri focus-visible:ring-offset-2 focus-visible:ring-offset-ll-cream-dark',
              )}
            >
              Open messages
              <ArrowRight />
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

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

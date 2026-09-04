import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings, useOpenBookings } from '../../hooks/useBookings'
import { PageBody } from '../../components/layout/AppLayout'
import { SummaryCard } from '../../components/SummaryCard'
import { ReviewModal } from '../../components/ReviewModal'
import { Button, Card } from '../../components/ui'
import { Grain, Sparkle } from '../../components/theme'
import { useButtonHover } from '../../lib/motion'
import { formatDate, formatTimeRange } from '../../lib/format'
import type { Booking } from '../../types'
import { todayISO } from '../../lib/bookingRules'

export function NannyDashboard() {
  const { profile, user } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'nanny')
  // Count only — claiming open posts now happens on the Job Board tab (NannyJobBoardPage).
  const open = useOpenBookings()
  const [reviewing, setReviewing] = useState<Booking | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const btnHover = useButtonHover()

  const firstName = profile?.fullName?.split(' ')[0] ?? 'there'
  const today = todayISO()
  const upcoming = bookings
    .filter((b) => b.status === 'confirmed' && b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const next = upcoming[0]
  // Review prompts: confirmed bookings whose date has passed.
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
              Hi, {firstName}
            </h1>
            <p className="mt-1 max-w-md text-ll-warm-gray">
              Your bookings and open requests at a glance.
            </p>
          </div>
          <motion.div {...btnHover} className="inline-block">
            <Link to="/nanny/calendar">
              <Button variant="secondary">View calendar</Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Next booking"
            value={next ? formatDate(next.date) : 'None yet'}
            hint={
              next
                ? `${next.familyName} · ${formatTimeRange(next.startTime, next.endTime)}`
                : 'None scheduled'
            }
            accent
          />
          {/* Open bookings now live on the Job Board tab; this card is a count that links there. */}
          <Link to="/nanny/job-board" className="block">
            <SummaryCard label="Job Board" value={open.length} hint="Open bookings to claim" />
          </Link>
          <SummaryCard label="Confirmed" value={upcoming.length} hint="Upcoming this period" />
        </div>

        {toReview.length > 0 && (
          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-ll-terra" />
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
                  <p className="font-display text-display-sm leading-none text-ll-ink">{b.familyName}</p>
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

      </PageBody>

      <ReviewModal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        booking={reviewing}
        authorId={user?.uid ?? ''}
        authorRole="nanny"
      />
    </>
  )
}

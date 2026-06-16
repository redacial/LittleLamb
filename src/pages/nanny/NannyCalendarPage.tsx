import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings } from '../../hooks/useBookings'
import { useNannyProfile } from '../../hooks/useProfile'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { MonthGrid } from '../../components/calendar/MonthGrid'
import { Card, CardLabel, Button } from '../../components/ui'
import { DAYS } from '../../components/onboarding/AvailabilityEditor'
import { to12h } from '../../lib/format'
import { cn } from '../../lib/cn'

/** Nanny calendar — booked sessions in the month grid + a read-out of weekly availability. */
export function NannyCalendarPage() {
  const { user } = useAuth()
  const { bookings } = useMyBookings(user?.uid, 'nanny')
  const { profile: nanny } = useNannyProfile(user?.uid)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Your confirmed sessions. Manage weekly hours from your profile."
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <span className="min-w-32 text-center font-mono text-mono-sm font-medium text-ll-ink">
              {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight />
            </Button>
          </div>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <MonthGrid year={year} month={month} today={today} bookings={bookings} />
          <Card>
            <CardLabel>Weekly availability</CardLabel>
            <ul className="mt-2 divide-y divide-ll-cream-dark text-sm">
              {DAYS.map((label, day) => {
                const block = nanny?.availability?.find((a) => a.day === day)
                return (
                  <li key={label} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="font-medium text-ll-ink">{label.slice(0, 3)}</span>
                    <span
                      className={cn(
                        'font-mono text-mono-sm',
                        block ? 'text-ll-peri-ink' : 'text-ll-warm-gray',
                      )}
                    >
                      {block ? `${to12h(block.start)} to ${to12h(block.end)}` : 'Off'}
                    </span>
                  </li>
                )
              })}
            </ul>
            <Link to="/nanny/profile">
              <Button variant="secondary" size="sm" className="mt-3 w-full">Edit availability</Button>
            </Link>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

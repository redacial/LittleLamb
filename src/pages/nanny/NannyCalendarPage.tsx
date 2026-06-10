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
            <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} aria-label="Previous month">←</Button>
            <span className="min-w-32 text-center font-semibold">
              {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} aria-label="Next month">→</Button>
          </div>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <MonthGrid year={year} month={month} today={today} bookings={bookings} />
          <Card>
            <CardLabel>Weekly availability</CardLabel>
            <ul className="mt-2 divide-y divide-charcoal/5 text-sm">
              {DAYS.map((label, day) => {
                const block = nanny?.availability?.find((a) => a.day === day)
                return (
                  <li key={label} className="flex items-center justify-between py-1.5">
                    <span className="font-semibold">{label.slice(0, 3)}</span>
                    <span className={block ? 'text-sage-700' : 'text-charcoal-faint'}>
                      {block ? `${to12h(block.start)}–${to12h(block.end)}` : '—'}
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

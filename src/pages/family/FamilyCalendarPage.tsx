import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings, createBooking } from '../../hooks/useBookings'
import { useFamilyProfile } from '../../hooks/useProfile'
import { useNannyDirectory } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { MonthGrid } from '../../components/calendar/MonthGrid'
import { Modal, Button, Input, Textarea, Select, Avatar, StatusPill } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import type { Booking, BookingStatus } from '../../types'

/** Determine booking status from timing + chosen nanny's availability (CLAUDE.md §11.1). */
function resolveStatus(date: string, today: string, withinHours: boolean): BookingStatus {
  if (date === today) return 'same_day_review' // routed to admin
  if (!withinHours) return 'pending' // outside preset hours -> nanny accepts/declines
  return 'confirmed'
}

export function FamilyCalendarPage() {
  const { user, profile } = useAuth()
  const [params] = useSearchParams()
  const { bookings } = useMyBookings(user?.uid, 'family')
  const { profile: family } = useFamilyProfile(user?.uid)
  const { nannies } = useNannyDirectory()

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const [viewBooking, setViewBooking] = useState<Booking | null>(null)
  const [start, setStart] = useState('15:00')
  const [end, setEnd] = useState('20:00')
  const [nannyId, setNannyId] = useState(params.get('nanny') ?? '')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  async function confirm() {
    if (!user || !profile || !pickedDay) return
    const chosen = nannies.find((n) => n.uid === nannyId)
    // Within-hours check: does the nanny have an availability block covering this weekday/time?
    const weekday = new Date(pickedDay + 'T00:00').getDay()
    const block = chosen?.availability?.find((a) => a.day === weekday)
    const withinHours = !!block && start >= block.start && end <= block.end
    const status = resolveStatus(pickedDay, today, withinHours)

    setBusy(true)
    try {
      await createBooking({
        familyId: user.uid,
        familyName: profile.fullName,
        nannyId: chosen?.uid ?? null,
        nannyName: chosen?.fullName ?? null,
        date: pickedDay,
        startTime: start,
        endTime: end,
        address: family?.homeAddress ?? '',
        notes,
        status,
      })
      setPickedDay(null)
      setNotes('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Tap a day to book. Green is confirmed, amber is awaiting your nanny."
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
        <MonthGrid
          year={year}
          month={month}
          today={today}
          bookings={bookings}
          onPickDay={(d) => setPickedDay(d)}
          onPickBooking={(b) => setViewBooking(b)}
        />

        {/* New booking modal */}
        <Modal open={!!pickedDay} onClose={() => setPickedDay(null)} title={pickedDay ? `Book for ${formatDate(pickedDay)}` : ''}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input label="End" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Select label="Nanny" value={nannyId} onChange={(e) => setNannyId(e.target.value)}>
              <option value="">No preference (find a match)</option>
              {nannies.map((n) => (
                <option key={n.uid} value={n.uid}>{n.fullName}</option>
              ))}
            </Select>
            <Textarea label="Notes for your nanny" hint="e.g. Dinner at 6, bedtime at 8" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {pickedDay === today && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Same-day bookings are confirmed by our team — we’ll reach out shortly.
              </p>
            )}
            <Button className="w-full" onClick={confirm} loading={busy}>Confirm booking</Button>
          </div>
        </Modal>

        {/* View booking modal */}
        <Modal open={!!viewBooking} onClose={() => setViewBooking(null)} title="Booking details">
          {viewBooking && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar name={viewBooking.nannyName ?? 'Nanny'} size="md" />
                <div>
                  <p className="font-semibold">{viewBooking.nannyName ?? 'Finding a nanny'}</p>
                  <StatusPill status={viewBooking.status} tone={viewBooking.status === 'confirmed' ? 'confirmed' : 'pending'} />
                </div>
              </div>
              <p className="text-sm text-charcoal-muted">{formatDate(viewBooking.date)} · {formatTimeRange(viewBooking.startTime, viewBooking.endTime)}</p>
              <p className="text-sm text-charcoal-muted">{viewBooking.address}</p>
              {viewBooking.notes && <p className="text-sm">“{viewBooking.notes}”</p>}
            </div>
          )}
        </Modal>
      </PageBody>
    </>
  )
}

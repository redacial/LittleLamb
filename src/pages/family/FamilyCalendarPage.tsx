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
import { cn } from '../../lib/cn'
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
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <span className="min-w-36 text-center font-display text-display-sm leading-none text-ll-ink">
              {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight />
            </Button>
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

        {/* Calm, static legend — no motion on the data surface. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ll-warm-gray">
          <LegendDot className="bg-ll-sage" label="Confirmed" />
          <LegendDot className="bg-ll-terra" label="Awaiting nanny" />
          <LegendDot className="bg-ll-peri" label="Booked" />
        </div>

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
              <p className="rounded-ll-input border-1.5 border-ll-peri-soft bg-ll-peri-light px-3 py-2 text-sm text-ll-peri-ink">
                Same-day bookings are confirmed by our team. We will reach out shortly.
              </p>
            )}
            <Button className="w-full" onClick={confirm} loading={busy}>Confirm booking</Button>
          </div>
        </Modal>

        {/* View booking modal */}
        <Modal open={!!viewBooking} onClose={() => setViewBooking(null)} title="Booking details">
          {viewBooking && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={viewBooking.nannyName ?? 'Nanny'} size="md" />
                <div className="min-w-0">
                  <p className="font-display text-display-sm leading-none text-ll-ink">
                    {viewBooking.nannyName ?? 'Finding a nanny'}
                  </p>
                  <div className="mt-1.5">
                    <StatusPill
                      status={viewBooking.status}
                      tone={viewBooking.status === 'confirmed' ? 'confirmed' : 'pending'}
                    />
                  </div>
                </div>
              </div>
              <span className="trust-chip">
                <ShieldIcon /> Background-checked nanny
              </span>
              <p className="text-sm text-ll-warm-gray">
                {formatDate(viewBooking.date)} · {formatTimeRange(viewBooking.startTime, viewBooking.endTime)}
              </p>
              <p className="text-sm text-ll-warm-gray">{viewBooking.address}</p>
              {viewBooking.notes && (
                <p className="rounded-ll-input bg-ll-cream-dark px-3 py-2 text-sm text-ll-ink">
                  {viewBooking.notes}
                </p>
              )}
            </div>
          )}
        </Modal>
      </PageBody>
    </>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('h-2.5 w-2.5 rounded-full border-1.5 border-ll-ink/10', className)} aria-hidden />
      {label}
    </span>
  )
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 3.5 5.5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2z" opacity="0.25" />
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2zm0 1.6L4.2 4.1v2.9c0 2.7 1.6 5 3.8 6 2.2-1 3.8-3.3 3.8-6V4.1L8 2.6zm2.3 2.6l.9.9-3.6 3.6-2-2 .9-.9 1.1 1.1 2.7-2.7z" />
    </svg>
  )
}

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMyBookings, createBooking } from '../../hooks/useBookings'
import { useFamilyProfile } from '../../hooks/useProfile'
import { useNannyDirectory } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { MonthGrid } from '../../components/calendar/MonthGrid'
import { Modal, Button, Input, Textarea, Select, Avatar, StatusPill, useToast } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import { cn } from '../../lib/cn'
import { rangesOverlap, overlapWindow, formatRate, resolveBookingStatus } from '../../lib/rates'
import { resolveRecurring } from '../../lib/recurring'
import { RateDisclaimer } from '../../components/ui'
import type { Booking } from '../../types'
import { todayISO, isWithinAvailability } from '../../lib/bookingRules'

export function FamilyCalendarPage() {
  const { user, profile } = useAuth()
  const [params] = useSearchParams()
  const { bookings } = useMyBookings(user?.uid, 'family')
  const { profile: family } = useFamilyProfile(user?.uid)
  const { nannies } = useNannyDirectory()
  const toast = useToast()

  const now = new Date()
  const today = todayISO(now)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const [viewBooking, setViewBooking] = useState<Booking | null>(null)
  const [start, setStart] = useState('15:00')
  const [end, setEnd] = useState('20:00')
  const [nannyId, setNannyId] = useState(params.get('nanny') ?? '')
  const [notes, setNotes] = useState('')
  const [wantsRecurring, setWantsRecurring] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live rate feedback for the nanny currently chosen in the booking modal.
  const selectedNanny = nannies.find((n) => n.uid === nannyId)
  const selectedRateOverlaps = rangesOverlap(family?.rateRange, selectedNanny?.rateRange)

  // Preview the recurring decision live, through the SAME function confirm() calls, so the
  // family is told a weekly slot won't be held BEFORE they commit rather than discovering it
  // afterwards. Mirrors the status logic in confirm(); both come from one place on submit.
  const previewWithinHours = pickedDay
    ? isWithinAvailability(selectedNanny?.availability, pickedDay, start, end)
    : false
  const recurringPreview = pickedDay
    ? resolveRecurring({
        requested: wantsRecurring,
        nannyId: selectedNanny?.uid ?? null,
        availability: selectedNanny?.availability,
        date: pickedDay,
        startTime: start,
        endTime: end,
        status: resolveBookingStatus({
          date: pickedDay,
          today,
          withinHours: previewWithinHours,
          rateOverlaps: selectedRateOverlaps,
        }),
      })
    : null

  const RECURRING_REFUSAL: Record<string, string> = {
    'no-nanny': 'Pick a specific nanny to hold a weekly slot — an open request has nobody to repeat with.',
    'outside-availability': 'This time is outside that nanny\u2019s weekly hours, so we can\u2019t hold it every week. The booking will still be sent as a one-off request.',
    'not-confirmed': 'We can only hold a weekly slot once a booking is confirmed. This one needs a reply first, so it will be booked as a one-off.',
  }

  function closeBookingModal() {
    setPickedDay(null)
    setError(null)
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  async function confirm() {
    if (!user || !profile || !pickedDay) return
    const chosen = nannies.find((n) => n.uid === nannyId)
    // Within-hours check: does the nanny have an availability block covering this weekday/time?
    // Same helper the preview above uses, so the two can never disagree about the very
    // question the modal is previewing.
    const withinHours = isWithinAvailability(chosen?.availability, pickedDay, start, end)
    // Rate check: do what this family will pay and what this nanny accepts overlap?
    const rateOverlaps = rangesOverlap(family?.rateRange, chosen?.rateRange)
    const status = resolveBookingStatus({ date: pickedDay, today, withinHours, rateOverlaps })

    // A recurring booking is a standing weekly claim on this nanny's time, so the request is
    // only granted when a named nanny's own availability covers the slot AND the booking
    // resolved to confirmed. resolveRecurring owns that decision (and returns why it refused),
    // so this page and the 48h auto-cancel job can never disagree about what "recurring" means.
    const recurringDecision = resolveRecurring({
      requested: wantsRecurring,
      nannyId: chosen?.uid ?? null,
      availability: chosen?.availability,
      date: pickedDay,
      startTime: start,
      endTime: end,
      status,
    })

    // Snapshot the rate onto the booking so a later profile edit can't rewrite what was
    // agreed. When the ranges overlapped that window IS the agreement; when they didn't
    // (or either side has no range) we record the nanny's asking range instead, with
    // rateAgreed false — the nanny sees what the family is working from before accepting.
    const agreed = overlapWindow(family?.rateRange, chosen?.rateRange)
    const snapshot = agreed ?? chosen?.rateRange ?? null

    setBusy(true)
    setError(null)
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
        recurring: recurringDecision.recurring,
        ...(snapshot
          ? {
              rateMinCents: snapshot.minCents,
              rateMaxCents: snapshot.maxCents,
              rateAgreed: agreed !== null,
            }
          : {}),
      })
      setPickedDay(null)
      setNotes('')
      setWantsRecurring(false)
      // F3: the confirm used to close the modal and go silent — no signal the booking landed,
      // let alone what state it landed in. The three outcomes mean genuinely different things to
      // a parent, so the acknowledgement names which one happened rather than a flat "done".
      const nannyLabel = chosen?.fullName?.split(' ')[0] ?? 'your nanny'
      toast.show(
        status === 'confirmed'
          ? `Booked with ${nannyLabel} — you're all set!`
          : status === 'same_day_review'
            ? "Posted for our nannies — we'll be in touch shortly about today."
            : `Sent to ${nannyLabel} to accept — we'll email you either way.`,
      )
    } catch (e) {
      // Without this the modal simply sat there with the notes still in it and the spinner
      // stopped — identical to nothing having happened — so the family clicked Confirm again.
      // Keep the form open and everything they typed; say what went wrong.
      setError(
        e instanceof Error && e.message
          ? e.message
          : 'We couldn’t save that booking. Please try again.',
      )
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
        <Modal open={!!pickedDay} onClose={closeBookingModal} title={pickedDay ? `Book for ${formatDate(pickedDay)}` : ''}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input label="End" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Select label="Nanny" value={nannyId} onChange={(e) => setNannyId(e.target.value)}>
              <option value="">No preference (find a match)</option>
              {nannies.map((n) => (
                <option key={n.uid} value={n.uid}>
                  {n.fullName}
                  {n.rateRange ? ` · ${formatRate(n.rateRange)}` : ''}
                </option>
              ))}
            </Select>
            {selectedNanny?.rateRange && (
              <div className="space-y-2">
                <p className="text-sm text-ll-ink">
                  {selectedNanny.fullName ?? 'This nanny'} asks {formatRate(selectedNanny.rateRange)}.
                </p>
                {!selectedRateOverlaps && (
                  // Soft-downgrade, not a block: say plainly what will happen so the
                  // family isn't surprised when the booking lands as a request.
                  <p className="rounded-ll-input border-1.5 border-ll-terra-deep bg-ll-terra-light px-3 py-2 text-sm text-ll-ink">
                    That&rsquo;s outside your budget of {formatRate(family?.rateRange)}. You can
                    still request them — the booking will be sent for them to accept or decline.
                  </p>
                )}
                <RateDisclaimer variant="short" />
              </div>
            )}
            <Textarea label="Notes for your nanny" hint="e.g. Dinner at 6, bedtime at 8" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {pickedDay === today && (
              <p className="rounded-ll-input border-1.5 border-ll-peri-soft bg-ll-peri-light px-3 py-2 text-sm text-ll-peri-ink">
                Same-day bookings are confirmed by our team. We will reach out shortly.
              </p>
            )}
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={wantsRecurring}
                  onChange={(e) => setWantsRecurring(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ll-sage-deep"
                />
                <span className="text-sm text-ll-ink">
                  Make this recurring
                  <span className="block text-ll-warm-gray">
                    Hold this same time every week with this nanny.
                  </span>
                </span>
              </label>
              {wantsRecurring && recurringPreview?.reason && (
                // Say plainly that the weekly hold won't apply, and why. The booking still
                // goes through as a one-off — this is a downgrade, never a block.
                <p className="rounded-ll-input border-1.5 border-ll-terra-deep bg-ll-terra-light px-3 py-2 text-sm text-ll-ink">
                  {RECURRING_REFUSAL[recurringPreview.reason]}
                </p>
              )}
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-ll-input border-1.5 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
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

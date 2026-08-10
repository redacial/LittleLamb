import { useState } from 'react'
import { useAllBookings, useUsersByRole } from '../../hooks/useAdmin'
import { useBookingActions, createBooking } from '../../hooks/useBookings'
import { useNannyDirectory } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import {
  Card,
  Button,
  Select,
  Input,
  Textarea,
  Modal,
  StatusPill,
  LoadErrorNotice,
  TruncatedNotice,
} from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import type { BookingStatus } from '../../types'

const STATUSES: BookingStatus[] = ['confirmed', 'pending', 'cancelled', 'open', 'unmatched', 'same_day_review']

/** Platform-wide bookings with filters, admin override actions (cancel), and manual create. */
export function AdminBookingsPage() {
  const { items: bookings, error: bookingsError, truncated } = useAllBookings()
  const { setStatus } = useBookingActions()
  const { users: families } = useUsersByRole('family')
  const { nannies } = useNannyDirectory()
  const [status, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = bookings
    .filter((b) => !status || b.status === status)
    .filter((b) => {
      const q = search.toLowerCase()
      return !q || b.familyName?.toLowerCase().includes(q) || (b.nannyName ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Every booking across the platform."
        action={<Button onClick={() => setCreating(true)}>Create booking</Button>}
      />
      <PageBody>
        {bookingsError && <LoadErrorNotice what="the bookings list" />}
        {truncated && (
          <div className="mb-4">
            <TruncatedNotice shown={bookings.length} what="bookings" />
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={status} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input placeholder="Search family or nanny" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
        </div>

        {filtered.length === 0 ? (
          <Card className="bg-ll-cream"><p className="text-sm text-ll-warm-gray">No bookings match.</p></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="inline-flex items-center gap-1.5 font-semibold text-ll-ink">
                      {b.familyName}
                      <Arrow />
                      {b.nannyName ?? 'Unmatched'}
                    </p>
                    <StatusPill status={b.status} tone={b.status === 'confirmed' ? 'confirmed' : b.status === 'cancelled' ? 'cancelled' : 'pending'} />
                  </div>
                  <p className="text-sm text-ll-warm-gray">{formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)} · {b.address}</p>
                </div>
                {b.status !== 'cancelled' && (
                  <Button size="sm" variant="danger" onClick={() => setStatus(b.id, 'cancelled')}>Cancel</Button>
                )}
              </Card>
            ))}
          </div>
        )}

        <CreateBookingModal
          open={creating}
          onClose={() => setCreating(false)}
          families={families.filter((f) => f.approved).map((f) => ({ uid: f.uid, name: f.fullName }))}
          nannies={nannies.map((n) => ({ uid: n.uid, name: n.fullName ?? 'Nanny' }))}
        />
      </PageBody>
    </>
  )
}

/** Admin-override booking creation — no availability restriction; confirmed immediately (CLAUDE.md §7.3). */
function CreateBookingModal({
  open,
  onClose,
  families,
  nannies,
}: {
  open: boolean
  onClose: () => void
  families: { uid: string; name: string }[]
  nannies: { uid: string; name: string }[]
}) {
  const [familyId, setFamilyId] = useState('')
  const [nannyId, setNannyId] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('15:00')
  const [end, setEnd] = useState('20:00')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = familyId && nannyId && date && !busy

  async function submit() {
    const family = families.find((f) => f.uid === familyId)
    const nanny = nannies.find((n) => n.uid === nannyId)
    if (!family || !nanny || !date) return
    setBusy(true)
    try {
      await createBooking({
        familyId: family.uid,
        familyName: family.name,
        nannyId: nanny.uid,
        nannyName: nanny.name,
        date,
        startTime: start,
        endTime: end,
        address: '', // Admin confirms address with the family offline; editable later.
        notes,
        status: 'confirmed',
      })
      // Reset and close.
      setFamilyId('')
      setNannyId('')
      setDate('')
      setNotes('')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a booking">
      <div className="space-y-4">
        <p className="text-sm text-ll-warm-gray">
          Full override, no availability check. Confirm details with both parties first; the
          booking is created as confirmed and appears in both records immediately.
        </p>
        <Select label="Family" value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
          <option value="">Select a family</option>
          {families.map((f) => <option key={f.uid} value={f.uid}>{f.name}</option>)}
        </Select>
        <Select label="Nanny" value={nannyId} onChange={(e) => setNannyId(e.target.value)}>
          <option value="">Select a nanny</option>
          {nannies.map((n) => <option key={n.uid} value={n.uid}>{n.name}</option>)}
        </Select>
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="End" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Textarea label="Notes" hint="Address can be added or edited on the booking afterward." value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button className="w-full" onClick={submit} loading={busy} disabled={!canSubmit}>
          Create booking
        </Button>
      </div>
    </Modal>
  )
}

/** Family-to-nanny relationship arrow — inline SVG (no glyph dashes/arrows in UI copy). */
function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-ll-warm-gray" fill="none" stroke="currentColor" strokeWidth="2" aria-label="to">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

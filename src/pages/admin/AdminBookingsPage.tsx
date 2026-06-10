import { useState } from 'react'
import { useAllBookings } from '../../hooks/useAdmin'
import { useBookingActions } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, Button, Select, Input, StatusPill } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import type { BookingStatus } from '../../types'

const STATUSES: BookingStatus[] = ['confirmed', 'pending', 'cancelled', 'open', 'unmatched', 'same_day_review']

/** Platform-wide bookings with filters + admin override actions (cancel). */
export function AdminBookingsPage() {
  const bookings = useAllBookings()
  const { setStatus } = useBookingActions()
  const [status, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const filtered = bookings
    .filter((b) => !status || b.status === status)
    .filter((b) => {
      const q = search.toLowerCase()
      return !q || b.familyName?.toLowerCase().includes(q) || (b.nannyName ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every booking across the platform." />
      <PageBody>
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={status} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input placeholder="Search family or nanny" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
        </div>

        {filtered.length === 0 ? (
          <Card className="bg-cream-100"><p className="text-sm text-charcoal-muted">No bookings match.</p></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{b.familyName} → {b.nannyName ?? 'Unmatched'}</p>
                    <StatusPill status={b.status} tone={b.status === 'confirmed' ? 'confirmed' : b.status === 'cancelled' ? 'cancelled' : 'pending'} />
                  </div>
                  <p className="text-sm text-charcoal-muted">{formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)} · {b.address}</p>
                </div>
                {b.status !== 'cancelled' && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(b.id, 'cancelled')}>Cancel</Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}

// The third and worst-consequence consumer of the hardcoded-rate bug. FamilyBillingPage and
// AdminAnalyticsPage were fixed in 96699f3, but this page still had `const SUBSCRIPTION = 25`
// — and unlike those two, its numbers are exported to CSV and handed to a bookkeeper. A stale
// rate here doesn't just look wrong on screen, it lands in the accounting record.
//
// UNITS: config/billing stores CENTS; this page renders and exports DOLLARS.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminBillingPage } from './AdminBillingPage'

const billing = {
  current: { config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false }, loading: false },
}
const bookings = { current: [] as { status: string; familyId?: string }[] }
const families = { current: [] as { uid: string; fullName: string; approved: boolean }[] }

vi.mock('../../hooks/useAdmin', () => ({
  useBillingConfig: () => billing.current,
  useAllBookings: () => ({ items: bookings.current, truncated: false }),
  useUsersByRole: () => ({ users: families.current, truncated: false }),
  useBillingAlerts: () => ({ items: [], truncated: false }),
}))
vi.mock('../../hooks/useInvoices', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useInvoices')>('../../hooks/useInvoices')
  return { ...actual, useInvoices: () => ({ items: [], truncated: false, error: null }) }
})

const show = () => render(<MemoryRouter><AdminBillingPage /></MemoryRouter>)

beforeEach(() => {
  billing.current = {
    config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
    loading: false,
  }
  bookings.current = []
  families.current = [{ uid: 'f1', fullName: 'The Ortegas', approved: true }]
})

describe('AdminBillingPage — rates come from config, not constants', () => {
  it('renders the configured subscription price, not a hardcoded $25', () => {
    billing.current.config = { subscriptionCents: 3500, perBookingCents: 250, enabled: false }
    show()
    expect(screen.getAllByText(/\$35\.00/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/\$25\.00\/qtr/)).not.toBeInTheDocument()
  })

  it('computes quarterly revenue from the configured rates', () => {
    // 2 active families x $35 + 4 confirmed bookings x $2.50 = $80.00
    billing.current.config = { subscriptionCents: 3500, perBookingCents: 250, enabled: false }
    families.current = [
      { uid: 'f1', fullName: 'A', approved: true },
      { uid: 'f2', fullName: 'B', approved: true },
    ]
    bookings.current = Array.from({ length: 4 }, () => ({ status: 'confirmed', familyId: 'f1' }))
    show()
    expect(screen.getAllByText(/\$80\.00/).length).toBeGreaterThan(0)
  })

  it('never renders the raw cents value as if it were dollars', () => {
    billing.current.config = { subscriptionCents: 3500, perBookingCents: 250, enabled: false }
    show()
    // The 100x bug: 3500 cents rendered as $3,500.00.
    expect(screen.queryByText(/\$3,500\.00/)).not.toBeInTheDocument()
  })
})

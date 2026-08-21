// The rates shown here MUST be the rates the server charges from. Both were hardcoded
// (`const SUBSCRIPTION = 25`), while functions/src/billing/quarterlyCharge.ts loadRates()
// reads config/billing — the doc the admin Settings > Billing tab writes. So the moment Lucy
// changed a price, this page kept quoting the OLD number while the card was charged the NEW
// one, and printInvoice put that stale figure on a PDF the family keeps.
//
// UNITS: config/billing stores CENTS (2500); this page renders DOLLARS. See the warning on
// the Invoice interface in src/types/index.ts — getting this wrong is a 100x error.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FamilyBillingPage } from './FamilyBillingPage'
import type { Booking } from '../../types'

const billing = {
  current: { config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false }, loading: false },
}
const bookingsRef = { current: [] as Partial<Booking>[] }

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'f1' }, profile: { fullName: 'The Ito Family' }, loading: false }),
}))

vi.mock('../../hooks/useBookings', () => ({
  useMyBookings: () => ({ bookings: bookingsRef.current, loading: false }),
}))

// Mirror the real hook's shape: config identity is stable across renders (useState).
vi.mock('../../hooks/useAdmin', () => ({
  useBillingConfig: () => billing.current,
}))

const printInvoice = vi.fn()
vi.mock('../../lib/exporters', () => ({ printInvoice: (...a: unknown[]) => printInvoice(...a) }))

const confirmed = (n: number) => Array.from({ length: n }, () => ({ status: 'confirmed' as const }))

beforeEach(() => {
  printInvoice.mockClear()
  bookingsRef.current = []
  billing.current = {
    config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
    loading: false,
  }
})

describe('FamilyBillingPage — rates come from config/billing', () => {
  it('renders the configured subscription in DOLLARS, not raw cents', () => {
    billing.current.config = { subscriptionCents: 2500, perBookingCents: 100, enabled: false }
    render(<FamilyBillingPage />)
    // 2500 cents is $25.00 — never "$2,500.00". (With no bookings the estimate is also
    // $25.00, so match all occurrences rather than asserting a single one.)
    expect(screen.getAllByText('$25.00').length).toBeGreaterThan(0)
    expect(screen.getByText('$1.00')).toBeInTheDocument()
    expect(screen.queryByText('$2,500.00')).not.toBeInTheDocument()
    expect(screen.queryByText('$100.00')).not.toBeInTheDocument()
  })

  it('follows a rate change made in Settings instead of showing the old hardcoded price', () => {
    // Lucy raises the subscription to $30 and the per-booking fee to $2.
    billing.current.config = { subscriptionCents: 3000, perBookingCents: 200, enabled: true }
    bookingsRef.current = confirmed(3)

    render(<FamilyBillingPage />)

    expect(screen.getByText('$30.00')).toBeInTheDocument()
    expect(screen.getByText('$2.00')).toBeInTheDocument()
    // Estimated next bill = $30 + 3 x $2 = $36.
    expect(screen.getByText('$36.00')).toBeInTheDocument()
    // The old hardcoded numbers must be gone entirely.
    expect(screen.queryByText('$25.00')).not.toBeInTheDocument()
    expect(screen.queryByText('$28.00')).not.toBeInTheDocument()
  })

  it('handles a fractional rate without a rounding error', () => {
    // $27.50 subscription, $1.50 per booking, 2 bookings => $30.50.
    billing.current.config = { subscriptionCents: 2750, perBookingCents: 150, enabled: true }
    bookingsRef.current = confirmed(2)

    render(<FamilyBillingPage />)

    expect(screen.getByText('$30.50')).toBeInTheDocument()
  })

  it('counts only CONFIRMED bookings toward the estimate', () => {
    bookingsRef.current = [
      { status: 'confirmed' },
      { status: 'cancelled' },
      { status: 'pending' },
      { status: 'confirmed' },
    ]
    render(<FamilyBillingPage />)
    // $25 + 2 x $1 = $27.
    expect(screen.getByText('$27.00')).toBeInTheDocument()
  })

  it('shows a loading state rather than flashing a wrong price before config resolves', () => {
    // Rendering the 2500-cent default while loading would show $25 to a family on a $30
    // plan for one frame — a number they may screenshot. Show nothing instead.
    billing.current = {
      config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
      loading: true,
    }

    render(<FamilyBillingPage />)

    expect(screen.queryByText('$25.00')).not.toBeInTheDocument()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})

describe('FamilyBillingPage — printed invoice uses live rates', () => {
  it('puts the CONFIGURED rates on the invoice a family keeps', async () => {
    billing.current.config = { subscriptionCents: 3000, perBookingCents: 200, enabled: true }
    bookingsRef.current = confirmed(3)

    render(<FamilyBillingPage />)
    await userEvent.click(screen.getByRole('button', { name: /download this quarter/i }))

    expect(printInvoice).toHaveBeenCalledTimes(1)
    const inv = printInvoice.mock.calls[0][0] as {
      total: number
      lineItems: { label: string; amount: number }[]
      familyName: string
    }

    // Dollars on the invoice — 30, not 3000.
    expect(inv.total).toBe(36)
    expect(inv.lineItems[0].amount).toBe(30)
    expect(inv.lineItems[1].amount).toBe(6)
    expect(inv.lineItems[1].label).toContain('$2.00')
    expect(inv.familyName).toBe('The Ito Family')
  })
})

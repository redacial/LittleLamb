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

// stripeEnabled is the free-launch gate: when it's false (billing off), the page shows a
// "Little Lamb is free" panel instead of any pricing. The pricing-correctness tests below
// therefore run with it forced TRUE — that is the billing-live world they were written to
// protect (the 100x cents/dollars bug). A dedicated test covers the billing-off free panel.
const stripeOn = { current: true }
vi.mock('../../hooks/useBilling', () => ({
  get stripeEnabled() {
    return stripeOn.current
  },
}))

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

beforeEach(() => {
  printInvoice.mockClear()
  bookingsRef.current = []
  // Default to billing-ON for the pricing-correctness suite below. The free-launch test flips
  // it off explicitly.
  stripeOn.current = true
  billing.current = {
    config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
    loading: false,
  }
})

describe('FamilyBillingPage — free-launch (billing off)', () => {
  it('shows a free-service panel and NO old-model pricing when billing is off', () => {
    stripeOn.current = false
    billing.current.config = { subscriptionCents: 15000, perBookingCents: 100, enabled: false }
    render(<FamilyBillingPage />)

    // Presents Little Lamb as free, and the retired per-quarter / per-booking model never shows.
    expect(screen.getAllByText(/free/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/per quarter|per confirmed booking|auto-charged|estimated next bill/i)).not.toBeInTheDocument()
  })
})

// The model is now "first two bookings free, then a YEARLY subscription" (D77) — no per-booking
// fee, no quarter. The still-vital guard these tests protect is the 100x one: the subscription
// renders in DOLLARS from config/billing, never raw cents, and follows a Settings change.
describe('FamilyBillingPage — subscription comes from config/billing', () => {
  it('renders the configured subscription in DOLLARS, not raw cents', () => {
    billing.current.config = { subscriptionCents: 15000, perBookingCents: 100, enabled: false }
    render(<FamilyBillingPage />)
    // 15000 cents is $150.00 — never "$15,000.00".
    expect(screen.getAllByText('$150.00').length).toBeGreaterThan(0)
    expect(screen.queryByText('$15,000.00')).not.toBeInTheDocument()
    // The retired per-booking fee must NOT render as its own figure.
    expect(screen.queryByText('$1.00')).not.toBeInTheDocument()
  })

  it('follows a subscription change made in Settings instead of a hardcoded price', () => {
    billing.current.config = { subscriptionCents: 17500, perBookingCents: 200, enabled: true }
    render(<FamilyBillingPage />)

    expect(screen.getAllByText('$175.00').length).toBeGreaterThan(0)
    // The old hardcoded number must be gone.
    expect(screen.queryByText('$25.00')).not.toBeInTheDocument()
  })

  it('shows a loading state rather than flashing a wrong price before config resolves', () => {
    billing.current = {
      config: { subscriptionCents: 15000, perBookingCents: 100, enabled: false },
      loading: true,
    }

    render(<FamilyBillingPage />)

    expect(screen.queryByText('$150.00')).not.toBeInTheDocument()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})

describe('FamilyBillingPage — printed invoice uses the live subscription', () => {
  it('puts the CONFIGURED subscription in dollars on the invoice a family keeps', async () => {
    billing.current.config = { subscriptionCents: 15000, perBookingCents: 200, enabled: true }

    render(<FamilyBillingPage />)
    await userEvent.click(screen.getByRole('button', { name: /download summary/i }))

    expect(printInvoice).toHaveBeenCalledTimes(1)
    const inv = printInvoice.mock.calls[0][0] as {
      total: number
      lineItems: { label: string; amount: number }[]
      familyName: string
    }

    // Dollars on the invoice — 150, not 15000. Subscription-only, no per-booking line.
    expect(inv.total).toBe(150)
    expect(inv.lineItems).toHaveLength(1)
    expect(inv.lineItems[0].amount).toBe(150)
    expect(inv.familyName).toBe('The Ito Family')
  })
})

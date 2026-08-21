// Revenue here was computed from hardcoded rates (`const SUBSCRIPTION = 25`) while the server
// charges from config/billing. After any price change in Settings, every revenue figure Lucy
// and David use to run the business was wrong — and wrong silently, since the number still
// looks plausible. UNITS: the config is in CENTS; these cards render DOLLARS.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminAnalyticsPage } from './AdminAnalyticsPage'

const billing = {
  current: { config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false }, loading: false },
}
const bookings = { current: [] as { status: string; recurring?: boolean }[] }
const families = { current: [] as { approved: boolean; status?: string }[] }
const nannies = { current: [] as { approved: boolean; status?: string }[] }

vi.mock('../../hooks/useAdmin', () => ({
  useBillingConfig: () => billing.current,
  useAllBookings: () => ({ items: bookings.current, truncated: false }),
  useUsersByRole: (role: string) => ({
    users: role === 'family' ? families.current : nannies.current,
    truncated: false,
  }),
}))

const approved = (n: number) => Array.from({ length: n }, () => ({ approved: true }))
const confirmed = (n: number) => Array.from({ length: n }, () => ({ status: 'confirmed' }))

beforeEach(() => {
  billing.current = {
    config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
    loading: false,
  }
  bookings.current = []
  families.current = []
  nannies.current = []
})

describe('AdminAnalyticsPage — revenue uses the configured rates', () => {
  it('computes revenue from config/billing in dollars, not cents', () => {
    families.current = approved(4)
    bookings.current = confirmed(10)
    // 4 x $25 + 10 x $1 = $110.
    render(<AdminAnalyticsPage />)
    expect(screen.getByText('$110.00')).toBeInTheDocument()
    // A cents/dollars slip would render six figures.
    expect(screen.queryByText('$11,000.00')).not.toBeInTheDocument()
  })

  it('tracks a rate change from Settings rather than the old hardcoded $25/$1', () => {
    billing.current.config = { subscriptionCents: 3000, perBookingCents: 200, enabled: true }
    families.current = approved(4)
    bookings.current = confirmed(10)

    render(<AdminAnalyticsPage />)

    // 4 x $30 + 10 x $2 = $140 — not the $110 the hardcoded rates produce.
    expect(screen.getByText('$140.00')).toBeInTheDocument()
    expect(screen.queryByText('$110.00')).not.toBeInTheDocument()
  })

  it('derives MRR and average-revenue-per-family from the same configured rates', async () => {
    billing.current.config = { subscriptionCents: 3000, perBookingCents: 200, enabled: true }
    families.current = approved(3)
    bookings.current = confirmed(5)

    render(<AdminAnalyticsPage />)
    await userEvent.click(screen.getByRole('tab', { name: /revenue/i }))

    // revenue = 3 x $30 + 5 x $2 = $100. MRR = 3 x $30 / 3 = $30. Avg = $100 / 3 = $33.33.
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$30.00')).toBeInTheDocument()
    expect(screen.getByText('$33.33')).toBeInTheDocument()
  })

  it('does not render a revenue figure until the rate config resolves', () => {
    billing.current = {
      config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
      loading: true,
    }
    families.current = approved(4)
    bookings.current = confirmed(10)

    render(<AdminAnalyticsPage />)

    // Better a dash than a confident wrong number on the page the founders trust.
    expect(screen.queryByText('$110.00')).not.toBeInTheDocument()
  })
})

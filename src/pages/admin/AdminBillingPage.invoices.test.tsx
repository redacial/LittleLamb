import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminBillingPage } from './AdminBillingPage'

// THE POINT OF THIS SUITE: the invoices collection stores money in CENTS. A $27.00 invoice
// is the number 2700 on disk. Bind that straight to a dollar formatter and the admin reads
// $2,700.00 — a 100× overstatement on the page where money is reconciled.
//
// The second thing guarded here is `dryRun`. A dry-run invoice is money that was NEVER
// charged; it exists only because the billing job computes and records invoices with Stripe
// disabled. If it renders identically to a real payment, an admin reconciles against
// revenue that does not exist.

type Growing = {
  items: unknown[]
  error: Error | null
  truncated: boolean
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  loadMore: () => void
}

function blank(): Growing {
  return {
    items: [],
    error: null,
    truncated: false,
    hasMore: false,
    loading: false,
    loadingMore: false,
    loadMore: vi.fn(),
  }
}

const bookings: Growing = blank()
const families: Growing = blank()
const alerts: Growing = blank()
const invoices: Growing = blank()

vi.mock('../../hooks/useAdmin', () => ({
  useAllBookings: () => bookings,
  useUsersByRole: () => ({ ...families, users: families.items }),
  useBillingAlerts: () => alerts,
}))

vi.mock('../../hooks/useInvoices', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useInvoices')>(
    '../../hooks/useInvoices',
  )
  return { ...actual, useInvoices: () => invoices }
})

vi.mock('../../lib/exporters', () => ({ downloadCSV: vi.fn() }))

/** A real $27.00 invoice as the server stores it: 2700 cents. */
function invoice(over: Record<string, unknown> = {}) {
  return {
    invoiceId: 'inv_1',
    familyId: 'fam_1',
    familyName: 'The Robinsons',
    periodStart: '2026-04-01',
    periodEnd: '2026-06-30',
    lineItems: [
      { label: 'Platform subscription', quantity: 1, unitCents: 2500, amountCents: 2500 },
      { label: 'Booking fee', quantity: 2, unitCents: 100, amountCents: 200 },
    ],
    totalCents: 2700,
    status: 'paid',
    pdfPath: 'invoices/fam_1/inv_1.pdf',
    dryRun: false,
    createdAt: null,
    ...over,
  }
}

/** Open the Invoice history tab and return its panel. */
async function openInvoiceHistory() {
  const user = userEvent.setup()
  render(<AdminBillingPage />)
  await user.click(screen.getByRole('tab', { name: /invoice history/i }))
  return user
}

beforeEach(() => {
  Object.assign(bookings, blank())
  Object.assign(families, blank())
  Object.assign(alerts, blank())
  Object.assign(invoices, blank())
})

describe('AdminBillingPage — invoice money must render in dollars, never raw cents', () => {
  it('renders totalCents 2700 as $27.00', async () => {
    invoices.items = [invoice()]

    await openInvoiceHistory()

    expect(screen.getByText('$27.00')).toBeInTheDocument()
  })

  it('never renders the raw cents value as a dollar amount', async () => {
    invoices.items = [invoice()]

    await openInvoiceHistory()

    // The 100× bug and the "renamed the field but forgot to divide" bug.
    expect(screen.queryByText('$2,700.00')).not.toBeInTheDocument()
    expect(screen.queryByText('$2700.00')).not.toBeInTheDocument()
    expect(screen.queryByText('$2,700')).not.toBeInTheDocument()
    // And it must be formatted as currency, not a bare/European-punctuated number.
    expect(screen.queryByText('27,00')).not.toBeInTheDocument()
    expect(screen.queryByText('2700')).not.toBeInTheDocument()
  })

  it('keeps cents precision — 2705 renders as $27.05', async () => {
    invoices.items = [invoice({ totalCents: 2705 })]

    await openInvoiceHistory()

    expect(screen.getByText('$27.05')).toBeInTheDocument()
  })

  it('renders a large invoice correctly — 1234567 cents is $12,345.67', async () => {
    invoices.items = [invoice({ totalCents: 1234567 })]

    await openInvoiceHistory()

    expect(screen.getByText('$12,345.67')).toBeInTheDocument()
  })

  it('shows the family name, period and status alongside the total', async () => {
    invoices.items = [invoice()]

    await openInvoiceHistory()

    expect(screen.getByText('The Robinsons')).toBeInTheDocument()
    expect(screen.getByText(/2026-04-01/)).toBeInTheDocument()
    expect(screen.getByText(/2026-06-30/)).toBeInTheDocument()
    expect(screen.getByText(/^paid$/i)).toBeInTheDocument()
  })
})

describe('AdminBillingPage — dry-run invoices must be unmistakable', () => {
  it('marks a dryRun invoice as not charged', async () => {
    invoices.items = [invoice({ dryRun: true })]

    await openInvoiceHistory()

    const row = screen.getByTestId('invoice-inv_1')
    expect(within(row).getByText(/not charged/i)).toBeInTheDocument()
  })

  it('does NOT mark a real invoice as a dry run', async () => {
    invoices.items = [invoice({ dryRun: false })]

    await openInvoiceHistory()

    const row = screen.getByTestId('invoice-inv_1')
    expect(within(row).queryByText(/not charged/i)).not.toBeInTheDocument()
    expect(within(row).queryByText(/dry run/i)).not.toBeInTheDocument()
  })

  it('flags a dryRun invoice even when its status says paid', async () => {
    // The trap: the billing job records status 'pending'/'paid' independently of dryRun,
    // so status alone cannot tell an admin whether money moved.
    invoices.items = [invoice({ dryRun: true, status: 'paid' })]

    await openInvoiceHistory()

    const row = screen.getByTestId('invoice-inv_1')
    expect(within(row).getByText(/not charged/i)).toBeInTheDocument()
  })
})

describe('AdminBillingPage — invoice list load states', () => {
  it('shows a load error rather than an empty history', async () => {
    invoices.error = new Error('permission-denied')

    await openInvoiceHistory()

    expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument()
    expect(screen.queryByText(/no invoices yet/i)).not.toBeInTheDocument()
  })

  it('shows an empty state only when the read succeeded and returned nothing', async () => {
    await openInvoiceHistory()

    expect(screen.getByText(/no invoices yet/i)).toBeInTheDocument()
  })
})

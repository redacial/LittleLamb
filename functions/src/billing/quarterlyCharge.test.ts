import { describe, it, expect } from 'vitest'
import { invoiceLineItems, computeInvoiceTotal } from './quarterlyCharge'
import type { BillingRates } from './types'

const rates: BillingRates = { subscriptionCents: 2500, perBookingCents: 100 }

describe('quarterly billing math', () => {
  it('is $25 flat with zero bookings', () => {
    expect(computeInvoiceTotal(0, rates)).toBe(2500)
  })

  it('adds $1 per confirmed booking', () => {
    expect(computeInvoiceTotal(7, rates)).toBe(2500 + 700)
  })

  it('produces subscription + bookings line items with correct amounts', () => {
    const items = invoiceLineItems(3, rates)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ quantity: 1, amountCents: 2500 })
    expect(items[1]).toMatchObject({ quantity: 3, unitCents: 100, amountCents: 300 })
  })

  it('respects custom rates from config', () => {
    const custom: BillingRates = { subscriptionCents: 3000, perBookingCents: 150 }
    expect(computeInvoiceTotal(4, custom)).toBe(3000 + 600)
  })

  it('line item total equals computeInvoiceTotal', () => {
    const n = 12
    const sum = invoiceLineItems(n, rates).reduce((s, li) => s + li.amountCents, 0)
    expect(sum).toBe(computeInvoiceTotal(n, rates))
  })
})

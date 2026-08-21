import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInvoices, invoiceDollars } from './useInvoices'

// The invoices collection is stored in CENTS by the server. These tests exist to pin that
// down: the hook must hand the raw server shape through UNCONVERTED (so nothing silently
// halves or doubles a total in transit), and the one documented conversion point —
// invoiceDollars — must divide by exactly 100.
//
// Firestore is mocked wholesale so the test controls what the snapshot contains. The
// ../lib/firebase mock is needed because that module calls requireEnv() at import time.
vi.mock('../lib/firebase', () => ({ db: {} }))

interface FakeListener {
  emit: (docs: Array<{ id: string; data: Record<string, unknown> }>) => void
  fail: (err: Error) => void
}

const listeners: FakeListener[] = []

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  query: (base: unknown, ...parts: unknown[]) => ({ base, parts }),
  orderBy: (field: string, dir: string) => ({ kind: 'orderBy', field, dir }),
  limit: (n: number) => ({ kind: 'limit', n }),
  onSnapshot: (
    _q: unknown,
    onNext: (snap: unknown) => void,
    onError: (err: Error) => void,
  ) => {
    listeners.push({
      emit: (docs) =>
        onNext({
          size: docs.length,
          docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
        }),
      fail: onError,
    })
    return vi.fn()
  },
}))

const latest = () => listeners[listeners.length - 1]

beforeEach(() => {
  listeners.length = 0
})

/** A realistic server-written invoice doc: a $27.00 invoice stored as 2700 cents. */
const serverDoc = {
  id: 'inv_1',
  data: {
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
  },
}

describe('invoiceDollars — the single cents→dollars conversion point', () => {
  it('converts 2700 cents to 27 dollars, not 2700 and not 270000', () => {
    expect(invoiceDollars(2700)).toBe(27)
  })

  it('keeps sub-dollar precision (2705 cents is 27.05, not 27)', () => {
    expect(invoiceDollars(2705)).toBe(27.05)
  })

  it('handles zero without producing NaN', () => {
    expect(invoiceDollars(0)).toBe(0)
  })
})

describe('useInvoices', () => {
  it('passes the server document through in CENTS, unconverted', async () => {
    const { result } = renderHook(() => useInvoices())

    act(() => latest().emit([serverDoc]))

    await waitFor(() => expect(result.current.items).toHaveLength(1))

    const inv = result.current.items[0]
    // The hook must NOT convert. Conversion happens once, at render.
    expect(inv.totalCents).toBe(2700)
    expect(inv.invoiceId).toBe('inv_1')
    expect(inv.familyName).toBe('The Robinsons')
    expect(inv.periodStart).toBe('2026-04-01')
    expect(inv.periodEnd).toBe('2026-06-30')
    expect(inv.status).toBe('paid')
    expect(inv.dryRun).toBe(false)
    expect(inv.pdfPath).toBe('invoices/fam_1/inv_1.pdf')
    expect(inv.lineItems[1].amountCents).toBe(200)
  })

  it('falls back to the Firestore doc id when invoiceId is absent', async () => {
    const { result } = renderHook(() => useInvoices())

    act(() =>
      latest().emit([{ id: 'doc_abc', data: { ...serverDoc.data, invoiceId: undefined } }]),
    )

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0].invoiceId).toBe('doc_abc')
  })

  it('surfaces a read failure as an error rather than an empty list', async () => {
    const { result } = renderHook(() => useInvoices())

    act(() => latest().fail(new Error('permission-denied')))

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.items).toEqual([])
  })
})

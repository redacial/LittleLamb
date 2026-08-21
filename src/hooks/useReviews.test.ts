import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useReviews } from './useReviews'

// Reviews were a WRITE-ONLY collection: useSubmitReview did an addDoc and nothing in the
// entire codebase ever read the collection back. Three surfaces (NannyDashboard,
// FamilyDashboard, BookingsPage) asked families and nannies to write reviews that no human
// being could ever read — while CLAUDE.md says reviews exist precisely to give Lucy and
// David ground-level insight into match quality.
//
// These tests pin the reader. Firestore is mocked wholesale so the test controls the
// snapshot; ../lib/firebase is mocked because it calls requireEnv() at import time.
vi.mock('../lib/firebase', () => ({ db: {} }))

interface FakeListener {
  query: unknown
  emit: (docs: Array<{ id: string; data: Record<string, unknown> }>) => void
  fail: (err: Error) => void
}

const listeners: FakeListener[] = []

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  query: (base: unknown, ...parts: unknown[]) => ({ base, parts }),
  orderBy: (field: string, dir: string) => ({ kind: 'orderBy', field, dir }),
  limit: (n: number) => ({ kind: 'limit', n }),
  where: (field: string, op: string, value: unknown) => ({ kind: 'where', field, op, value }),
  addDoc: vi.fn(),
  serverTimestamp: () => 'ts',
  onSnapshot: (
    q: unknown,
    onNext: (snap: unknown) => void,
    onError: (err: Error) => void,
  ) => {
    listeners.push({
      query: q,
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

/** A review exactly as ReviewModal writes it via useSubmitReview. */
const reviewDoc = {
  id: 'rev_1',
  data: {
    bookingId: 'bk_1',
    authorId: 'fam_1',
    authorRole: 'family',
    subjectId: 'nanny_1',
    rating: 5,
    comment: 'Maria was wonderful with the twins.',
    createdAt: null,
  },
}

describe('useReviews — the missing reader', () => {
  it('returns reviews already in the collection (retroactive, not going-forward-only)', async () => {
    // The point of the whole task: reviews submitted BEFORE any reader existed must show
    // up. Nothing about the query may filter on a field only new writes would carry.
    const { result } = renderHook(() => useReviews())
    latest().emit([reviewDoc])

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0]).toMatchObject({
      id: 'rev_1',
      bookingId: 'bk_1',
      authorId: 'fam_1',
      authorRole: 'family',
      subjectId: 'nanny_1',
      rating: 5,
      comment: 'Maria was wonderful with the twins.',
    })
  })

  it('orders newest first — recent match quality is what Lucy is looking for', () => {
    renderHook(() => useReviews())
    const parts = (latest().query as { parts: Array<Record<string, unknown>> }).parts
    expect(parts).toContainEqual({ kind: 'orderBy', field: 'createdAt', dir: 'desc' })
  })

  it('reads the reviews collection, bounded by a limit', () => {
    renderHook(() => useReviews())
    const q = latest().query as { base: { name: string }; parts: Array<{ kind: string }> }
    expect(q.base.name).toBe('reviews')
    // Bounded: an unbounded live listener over a collection that grows forever re-downloads
    // every review ever written on every single write.
    expect(q.parts.some((p) => p.kind === 'limit')).toBe(true)
  })

  it('surfaces a read failure instead of degrading to an empty list', async () => {
    // The D50 failure mode. An empty reviews list and a permission-denied read render
    // identically, so an admin would conclude "nobody has left feedback" when in fact the
    // read broke — the exact bug the admin list hooks were fixed for.
    const { result } = renderHook(() => useReviews())
    latest().fail(new Error('permission-denied'))

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.items).toHaveLength(0)
  })

  it('can be scoped to one person, matching either side of the booking', async () => {
    // A review is about a nanny but written by a family (or vice versa). Scoping to a
    // person on AdminPeoplePage must find the reviews written ABOUT them.
    const { result } = renderHook(() => useReviews('nanny_1'))
    const parts = (latest().query as { parts: Array<Record<string, unknown>> }).parts
    expect(parts).toContainEqual({ kind: 'where', field: 'subjectId', op: '==', value: 'nanny_1' })

    latest().emit([reviewDoc])
    await waitFor(() => expect(result.current.items).toHaveLength(1))
  })

  it('treats an empty subject as "not ready" — no items, no error', () => {
    // AdminPeoplePage can render a row before an id is available. That must read as an
    // idle empty list, never as a failed read (which would show a scary error notice) and
    // never as a real query that matches nothing.
    const { result } = renderHook(() => useReviews(''))
    expect(result.current.items).toHaveLength(0)
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})

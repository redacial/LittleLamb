import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { useGrowingCollection } from './useGrowingCollection'

// The whole point of these tests is controlling what onSnapshot does, so firestore is
// mocked wholesale. ../lib/firebase is mocked too because it calls requireEnv() at module
// scope — importing it for real would couple these tests to env configuration.
vi.mock('../lib/firebase', () => ({ db: {} }))

interface FakeListener {
  windowSize: number
  emit: (size: number) => void
  fail: (err: Error) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

const listeners: FakeListener[] = []

vi.mock('firebase/firestore', () => ({
  onSnapshot: (
    q: { windowSize: number },
    onNext: (snap: unknown) => void,
    onError: (err: Error) => void,
  ) => {
    const unsubscribe = vi.fn()
    listeners.push({
      windowSize: q.windowSize,
      // A snapshot of `size` docs, each mapping to its index.
      emit: (size: number) =>
        onNext({ size, docs: Array.from({ length: size }, (_, i) => ({ data: () => i })) }),
      fail: onError,
      unsubscribe,
    })
    return unsubscribe
  },
}))

/** Stands in for a real Query; only the window size matters to the fake listener. */
const buildQuery = (pageLimit: number) => ({ windowSize: pageLimit }) as never
/** The fake snapshot's data() returns the doc's index; the real signature is irrelevant here. */
const mapDoc = (d: QueryDocumentSnapshot<DocumentData>) => d.data() as unknown as number

const PAGE = 10
const latest = () => listeners[listeners.length - 1]

beforeEach(() => {
  listeners.length = 0
})

describe('useGrowingCollection', () => {
  it('populates items and clears loading on the first snapshot', async () => {
    const { result } = renderHook(() => useGrowingCollection(buildQuery, mapDoc, PAGE))

    expect(result.current.loading).toBe(true)
    expect(latest().windowSize).toBe(PAGE)

    act(() => latest().emit(3))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(3)
    expect(result.current.error).toBeNull()
  })

  it('loadMore tears down the old listener and re-subscribes at double the limit', async () => {
    const { result } = renderHook(() => useGrowingCollection(buildQuery, mapDoc, PAGE))
    act(() => latest().emit(PAGE)) // a FULL page, so more may exist
    await waitFor(() => expect(result.current.hasMore).toBe(true))

    const first = latest()
    act(() => result.current.loadMore())

    // Widening must REPLACE the listener, not stack a second one — otherwise every
    // expansion leaks a live listener and its read cost.
    await waitFor(() => expect(first.unsubscribe).toHaveBeenCalled())
    expect(latest().windowSize).toBe(PAGE * 2)
  })

  it('reports hasMore false when a short page comes back', async () => {
    const { result } = renderHook(() => useGrowingCollection(buildQuery, mapDoc, PAGE))

    act(() => latest().emit(PAGE - 1)) // fewer than asked for => that is everything

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(false)
    expect(result.current.truncated).toBe(false)
  })

  it('keeps truncated true on a full page (the D58 invariant)', async () => {
    const { result } = renderHook(() => useGrowingCollection(buildQuery, mapDoc, PAGE))

    act(() => latest().emit(PAGE))

    await waitFor(() => expect(result.current.truncated).toBe(true))
  })

  it('resets to page 1 when the query identity changes', async () => {
    const { result, rerender } = renderHook(
      ({ q }: { q: (n: number) => never }) => useGrowingCollection(q, mapDoc, PAGE),
      { initialProps: { q: buildQuery } },
    )
    act(() => latest().emit(PAGE))
    await waitFor(() => expect(result.current.hasMore).toBe(true))
    act(() => result.current.loadMore())
    await waitFor(() => expect(latest().windowSize).toBe(PAGE * 2))

    // A different query builder means a different underlying list (e.g. AdminPeoplePage
    // switching from nannies to families). Inheriting the previous expansion would
    // silently over-read the new one.
    rerender({ q: (n: number) => ({ windowSize: n }) as never })

    await waitFor(() => expect(latest().windowSize).toBe(PAGE))
  })

  it('surfaces a read failure instead of an empty list', async () => {
    const { result } = renderHook(() => useGrowingCollection(buildQuery, mapDoc, PAGE))

    const boom = new Error('permission-denied')
    act(() => latest().fail(boom))

    await waitFor(() => expect(result.current.error).toBe(boom))
    expect(result.current.loading).toBe(false)
  })
})

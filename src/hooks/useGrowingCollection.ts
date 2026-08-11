// A live Firestore collection listener with a page size the caller can grow on demand.
import { useCallback, useEffect, useState } from 'react'
import {
  onSnapshot,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

/**
 * A live list that can be expanded, plus whether the read failed and whether it is partial.
 *
 * This is a SUPERSET of the older `AdminList<T>`: `items`, `error` and `truncated` keep their
 * exact previous meanings, so existing consumers keep working untouched.
 */
export interface GrowingList<T> {
  items: T[]
  /**
   * Non-null when the read FAILED. Callers must render a distinct "couldn't load" state —
   * never an empty state — because a permission error or outage otherwise renders
   * identically to "nothing to do" (see the AdminList doc comment in useAdmin.ts).
   */
  error: Error | null
  /**
   * True when the query filled its current page, so `items` is NOT known to be the whole
   * set. Pages that COUNT rather than list must surface this: a silently truncated list
   * reads as a complete one, which is how "there are no more failed payments" becomes a
   * wrong conclusion drawn from a page that simply stopped counting.
   */
  truncated: boolean
  /** False until the first snapshot (or error) arrives. */
  loading: boolean
  /** True while an expansion's first snapshot is still outstanding. */
  loadingMore: boolean
  /** True when a full page came back, so there may be more to fetch. */
  hasMore: boolean
  /** Widen the window by one page. No-op while already loading or when nothing is left. */
  loadMore: () => void
}

/**
 * One live listener whose `limit()` grows, rather than one listener per page.
 *
 * WHY NOT startAfter CURSORS: these are live `onSnapshot` listeners, so a cursor per page
 * means N concurrent listeners on a single screen (AdminBillingPage mounts three of these
 * hooks at once), and the pages must then be stitched back into one ordered array. A doc
 * deleted from page 1 does not shift page 2's window, because each cursor is pinned to a
 * snapshot of a document that may itself have been edited or removed. Reconciling several
 * independent docChanges() streams while AdminAnalyticsPage and AdminBillingPage *count*
 * the result is a genuinely hard correctness problem, and miscounting is precisely the
 * failure mode those pages must not have. One listener over one ordered array is correct
 * by construction.
 *
 * THE TRADE, stated honestly: widening re-reads every document in the new window, so five
 * expansions of 50 costs 50+100+150+200+250 = 750 reads rather than 250. That is acceptable
 * here — a handful of internal admins, expansion is a deliberate click rather than infinite
 * scroll, and the previous code already re-downloaded up to 200 docs on EVERY write to the
 * collection. Starting at a smaller page also makes the common case (one page, no clicks)
 * cheaper than it was before.
 *
 * @param buildQuery Builds the query for a given limit. MUST be referentially stable —
 *   wrap it in `useCallback` with the same dependencies you would give the effect. An
 *   unstable builder resets pagination on every render, so "load more" would never advance.
 * @param mapDoc Maps a document snapshot to T. Must also be stable; define it at module
 *   scope rather than inline.
 */
export function useGrowingCollection<T>(
  buildQuery: (pageLimit: number) => Query<DocumentData>,
  mapDoc: (snap: QueryDocumentSnapshot<DocumentData>) => T,
  pageSize: number,
): GrowingList<T> {
  const [items, setItems] = useState<T[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [pages, setPages] = useState(1)

  // Reset to the first page whenever the query itself changes. Without this, switching
  // AdminPeoplePage from nannies to families would inherit the previous role's expansion
  // and silently over-read. This is why buildQuery must be useCallback-stable: an unstable
  // identity would fire this reset on every render and pagination could never advance.
  useEffect(() => {
    setPages(1)
    setLoading(true)
  }, [buildQuery])

  useEffect(() => {
    const windowSize = pageSize * pages
    const unsubscribe = onSnapshot(
      buildQuery(windowSize),
      (snap) => {
        setItems(snap.docs.map(mapDoc))
        // A full window means the server had at least this many — there may be more.
        const full = snap.size >= windowSize
        setHasMore(full)
        setError(null)
        setLoading(false)
        setLoadingMore(false)
      },
      (err: Error) => {
        setError(err)
        setLoading(false)
        setLoadingMore(false)
      },
    )
    // Returning the unsubscribe means widening tears the previous listener down before the
    // wider one attaches — otherwise every expansion would leak a listener.
    return unsubscribe
  }, [buildQuery, mapDoc, pages, pageSize])

  const loadMore = useCallback(() => {
    setPages((prev) => {
      // Guarded inside the updater so a double-click can't skip a page.
      if (loadingMore) return prev
      setLoadingMore(true)
      return prev + 1
    })
  }, [loadingMore])

  return {
    items,
    error,
    // `truncated` and `hasMore` describe the same condition from two angles: the list is
    // partial. Both are exposed because callers use them differently — counting pages warn
    // on `truncated`, listing pages offer a button on `hasMore`.
    truncated: hasMore,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  }
}

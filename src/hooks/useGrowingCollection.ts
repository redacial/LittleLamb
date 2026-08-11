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
  const [activeQuery, setActiveQuery] = useState(() => buildQuery)

  // Reset DURING RENDER when the query changes, not in an effect.
  //
  // Doing this in an effect was wrong in two ways, both verified rather than theorised.
  // React would run the subscribe effect first — with the NEW query but the OLD page count
  // — and only then apply the reset, so every role switch opened a listener at the previous
  // expansion, tore it down and opened another (measured: window sizes [20, 10], ~100 wasted
  // document reads after a single "load more").
  //
  // Worse, `items` and `error` survived the switch. AdminPeoplePage renders the same
  // component instance across /admin/nannies → /admin/families (same component type, same
  // tree position, so React reuses it), which meant NANNY rows rendered briefly under the
  // "Families" header with family-labelled approve/reject buttons — an admin clicking
  // quickly could act on a row believing it was something else.
  //
  // This is React's documented "adjusting state when props change" pattern: the state is
  // corrected before anything commits, so no stale frame is ever shown and no listener is
  // opened against the wrong window.
  if (activeQuery !== buildQuery) {
    setActiveQuery(() => buildQuery)
    setPages(1)
    setItems([])
    setError(null)
    setHasMore(false)
    setLoading(true)
    setLoadingMore(false)
  }

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

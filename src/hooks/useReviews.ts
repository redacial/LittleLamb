// Reviews — members WRITE, admin READS (enforced by firestore.rules: `allow get, list: if
// isAdmin()`). One review per booking.
import { useCallback } from 'react'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cleanText } from '../lib/sanitize'
import { useGrowingCollection, type GrowingList } from './useGrowingCollection'
import type { Role, Review } from '../types'

export function useSubmitReview() {
  return useCallback(
    async (input: {
      bookingId: string
      authorId: string
      authorRole: Role
      subjectId: string
      rating: number
      comment: string
    }) => {
      await addDoc(collection(db, 'reviews'), {
        ...input,
        rating: Math.max(1, Math.min(5, Math.round(input.rating))),
        comment: cleanText(input.comment, 2000),
        createdAt: serverTimestamp(),
      })
    },
    [],
  )
}

/**
 * Page size for the admin reviews list. Matches ADMIN_PAGE_SIZE — deliberately duplicated
 * rather than imported so this hook does not pull the whole admin module into the bundle.
 */
const REVIEWS_PAGE_SIZE = 50

// Module scope: useGrowingCollection takes the mapper as an effect dependency, so an
// inline arrow would re-subscribe the listener on every render.
const mapReview = (d: QueryDocumentSnapshot<DocumentData>): Review => ({
  id: d.id,
  ...(d.data() as Omit<Review, 'id'>),
})

/** What an inactive (empty-subject) read returns: nothing, and not an error. */
const IDLE: GrowingList<Review> = {
  items: [],
  error: null,
  truncated: false,
  loading: false,
  loadingMore: false,
  hasMore: false,
  loadMore: () => {},
}

/**
 * ADMIN-ONLY live read of submitted reviews.
 *
 * Until this existed, `reviews` was write-only: useSubmitReview added docs and nothing in
 * the codebase ever read them back, so every review a family or nanny took the trouble to
 * write went into a collection no human could open. Reviews are the only ground-level
 * signal Lucy and David get on match quality, so losing them silently is the whole cost.
 *
 * @param subjectId When given, scopes to reviews written ABOUT that person. An empty
 *   string means "not ready yet" (e.g. a closed panel) and reads as an IDLE empty list —
 *   never as an error, which would show a load-failure notice for a panel nobody opened.
 *   The underlying listener still attaches (hooks cannot be called conditionally); the
 *   query is scoped to '' so it matches nothing and costs a single empty snapshot.
 */
export function useReviews(subjectId?: string): GrowingList<Review> {
  const scoped = subjectId !== undefined
  const inactive = scoped && subjectId === ''

  const buildQuery = useCallback(
    (n: number) => {
      const base = collection(db, 'reviews')
      // Newest first: recent match quality is what an admin is actually looking for, and
      // it keeps the bounded window on the reviews that matter.
      if (scoped) {
        return query(
          base,
          where('subjectId', '==', subjectId),
          orderBy('createdAt', 'desc'),
          limit(n),
        )
      }
      return query(base, orderBy('createdAt', 'desc'), limit(n))
    },
    [scoped, subjectId],
  )

  const live = useGrowingCollection(buildQuery, mapReview, REVIEWS_PAGE_SIZE)
  return inactive ? IDLE : live
}

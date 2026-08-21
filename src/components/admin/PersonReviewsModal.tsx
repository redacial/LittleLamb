import { Modal, Card, LoadErrorNotice, TruncatedNotice } from '../ui'
import { useReviews } from '../../hooks/useReviews'
import type { Timestamp } from 'firebase/firestore'
import type { Review } from '../../types'

/**
 * The admin reader for a collection that used to be write-only.
 *
 * `reviews` was written from three surfaces (NannyDashboard, FamilyDashboard, BookingsPage)
 * and read by NOTHING — families and nannies were asked, after every booking, to write
 * feedback that no human being could open. Per spec reviews are admin-only and never
 * public, and they are the one ground-level signal Lucy and David get on match quality, so
 * a write-only collection quietly threw away the whole point of asking.
 *
 * Scoped to reviews written ABOUT one person, because that is the question an admin
 * actually has while looking at a row: "how are visits with this nanny going?"
 *
 * Theme note: AdminPeoplePage is a dense work surface, so this stays calm — no tilt, no
 * grain. The rating is the only coloured element, in terracotta (the accent reserved for
 * things that want the eye).
 */
export function PersonReviewsModal({
  uid,
  fullName,
  open,
  onClose,
}: {
  uid: string
  fullName: string
  open: boolean
  onClose: () => void
}) {
  // Passing '' while closed scopes the query to a subject that matches nothing, so a page
  // full of rows costs one empty snapshot each rather than a real reviews read per row.
  // The result reads as an idle empty list, never as an error.
  const { items, error, loading, hasMore, loadMore, loadingMore } = useReviews(open ? uid : '')

  return (
    <Modal open={open} onClose={onClose} title={`Reviews about ${fullName}`}>
      <div className="space-y-3">
        <p className="text-sm text-ll-warm-gray">
          Shared with the Little Lamb team only — never shown to families or nannies.
        </p>

        {/* A failed read must never render as "No reviews yet": an admin would read that
            as "nobody has any complaints" when in fact the read broke. */}
        {error ? (
          <LoadErrorNotice what="the reviews" />
        ) : loading ? (
          <p className="text-sm text-ll-warm-gray">Loading…</p>
        ) : items.length === 0 ? (
          <Card className="bg-ll-cream">
            <p className="text-sm text-ll-warm-gray">No reviews yet for {fullName}.</p>
          </Card>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((r) => (
                <li key={r.id}>
                  <ReviewRow review={r} />
                </li>
              ))}
            </ul>
            {hasMore && (
              <TruncatedNotice
                shown={items.length}
                what="reviews"
                onLoadMore={loadMore}
                loadingMore={loadingMore}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

function ReviewRow({ review: r }: { review: Review }) {
  return (
    <Card className="bg-ll-cream">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-mono-sm text-ll-terra-deep">{r.rating} / 5</p>
        <p className="text-sm text-ll-warm-gray">
          {/* Who wrote it. The role is the load-bearing half: a family reviewing a nanny
              and a nanny reviewing a family are completely different signals. */}
          {r.authorRole === 'family' ? 'From the family' : 'From the nanny'}
          {' · '}
          {formatWhen(r.createdAt)}
        </p>
      </div>
      <p className="mt-2 text-ll-ink">
        {r.comment?.trim() ? r.comment : <span className="text-ll-warm-gray">No comment left.</span>}
      </p>
      {/* The booking is what makes a review actionable — "which visit was this?" */}
      <p className="mt-2 font-mono text-mono-sm text-ll-warm-gray">Booking {r.bookingId}</p>
    </Card>
  )
}

/**
 * `createdAt` is a server timestamp, so it is null for the moment between the local write
 * and the server round trip. Render that honestly rather than as an epoch date.
 */
function formatWhen(ts: Timestamp | null): string {
  const d = ts?.toDate?.()
  if (!d) return 'Just now'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

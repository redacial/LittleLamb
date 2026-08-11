// Shown when a list hit its query window, so what's on screen is NOT the whole set.
//
// Same principle as LoadErrorNotice: a partial list that looks complete is how someone
// concludes "there are no more failed payments" from a page that simply stopped counting.
// Silent truncation is a correctness bug wearing a performance fix's clothes.
import { Button } from './Button'

interface Props {
  /** How many rows are actually shown. */
  shown: number
  /** What is being listed, e.g. "bookings". Used in the sentence. */
  what: string
  /**
   * Widen the list by one page. Pass this on pages that LIST records.
   *
   * Deliberately omit it on pages that COUNT rather than list (Analytics, Billing): one
   * click cannot make a total correct, and offering the button there implies it can. Those
   * pages need "these figures understate", not "see more".
   */
  onLoadMore?: () => void
  /** True while the wider page is still loading; disables the button and shows a spinner. */
  loadingMore?: boolean
}

export function TruncatedNotice({ shown, what, onLoadMore, loadingMore }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-ll-input border-1.5 border-ll-peri-soft bg-ll-peri-light px-3 py-2 text-sm text-ll-peri-ink">
      <p className="flex-1">
        Showing the most recent {shown} {what}. There are more than this
        {onLoadMore ? '.' : ' — use filters to narrow down.'}
      </p>
      {onLoadMore && (
        <Button variant="secondary" size="sm" loading={loadingMore} onClick={onLoadMore}>
          Load more
        </Button>
      )}
    </div>
  )
}

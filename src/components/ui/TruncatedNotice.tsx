// Shown when a list hit its query cap, so what's on screen is NOT the whole set.
//
// Same principle as LoadErrorNotice: a partial list that looks complete is how someone
// concludes "there are no more failed payments" from a page that simply stopped counting.
// Silent truncation is a correctness bug wearing a performance fix's clothes.

interface Props {
  /** How many rows are actually shown. */
  shown: number
  /** What is being listed, e.g. "bookings". Used in the sentence. */
  what: string
}

export function TruncatedNotice({ shown, what }: Props) {
  return (
    <p className="rounded-ll-input border-1.5 border-ll-peri-soft bg-ll-peri-light px-3 py-2 text-sm text-ll-peri-ink">
      Showing the most recent {shown} {what}. There are more than this — use filters to
      narrow down, or check back here once paging is added.
    </p>
  )
}

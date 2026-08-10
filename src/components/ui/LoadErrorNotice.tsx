// Shown when an admin list FAILED to load, in place of the usual empty state.
//
// The distinction is the whole point: "no pending applications" and "we couldn't read
// the applications" look identical if a failed read renders as an empty list, and an
// admin who trusts the empty state leaves real applicants unreviewed. This makes the
// failure loud and tells them the data is unknown, not absent.

interface Props {
  /** What failed to load, e.g. "pending nanny applications". */
  what: string
}

export function LoadErrorNotice({ what }: Props) {
  return (
    <div
      role="alert"
      className="rounded-ll-card border-1.5 border-ll-terra-deep bg-ll-terra-light p-4 text-ll-ink"
    >
      <p className="font-medium">Couldn&rsquo;t load {what}.</p>
      <p className="mt-1 text-sm text-ll-warm-gray">
        This is a loading problem, not an empty list — there may be items you can&rsquo;t
        see right now. Refresh to try again.
      </p>
    </div>
  )
}

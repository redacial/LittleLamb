// Per-user outbound-email quota. Pure arithmetic, no Firestore — the wiring lives in
// send.ts, which applies this inside the transaction that already claims the mail doc.
//
// Why a rolling DAY bucketed by date string rather than a true sliding window: a sliding
// window needs the timestamps of every prior send, which means either an unbounded array
// on the counter doc or a subcollection read per send. A per-day bucket is one small doc,
// one read, and resets predictably. The tradeoff is that a burst can straddle midnight and
// effectively get 2x the cap for a few minutes — irrelevant for an abuse ceiling set well
// above honest usage.

export interface QuotaState {
  /** UTC date bucket this count belongs to, "YYYY-MM-DD". */
  day: string
  /** Sends already counted in that bucket. */
  count: number
}

export interface QuotaDecision {
  allowed: boolean
  /** The state to persist. On a new day this resets rather than accumulating. */
  next: QuotaState
}

/** UTC day bucket for a timestamp. UTC (not local) so the reset point can't shift. */
export function dayBucket(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Decide whether one more send is allowed, and return the counter state to write.
 *
 * `current` is null when the user has never sent before. A stored bucket from an earlier
 * day is treated as zero — the count restarts rather than carrying over.
 */
export function checkQuota(
  current: QuotaState | null,
  now: Date,
  maxPerDay: number,
): QuotaDecision {
  const day = dayBucket(now)
  const count = current && current.day === day ? current.count : 0

  if (count >= maxPerDay) {
    // Over the ceiling: don't increment, so the counter can't run away while blocked.
    return { allowed: false, next: { day, count } }
  }
  return { allowed: true, next: { day, count: count + 1 } }
}

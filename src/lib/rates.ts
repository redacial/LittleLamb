// Pay-rate matching. Pure + Firebase-free so it is fully unit-testable, following the
// src/lib/recurring.ts precedent for domain logic.
//
// The model: a family declares the hourly rate they'll PAY, a nanny the rate they
// ACCEPT. Both are RateRange values in integer cents. Where the two ranges overlap,
// there is a rate both sides have already agreed to in principle — that's a match.
//
// Little Lamb never processes wages (families pay nannies directly). These ranges are a
// MATCHING SIGNAL ONLY and must always be shown with the disclaimer in <RateDisclaimer>.
// Nothing here should ever be presented as an enforced or guaranteed rate.

import type { RateRange, BookingStatus } from '../types'

/** Highest rate we'll accept from a client, in cents ($500/hr). Mirrored in firestore.rules. */
export const RATE_MAX_CENTS = 50_000

/** A range is usable only if both bounds are present, whole, in-band, and ordered. */
export function isValidRange(r?: RateRange | null): r is RateRange {
  if (!r) return false
  const { minCents, maxCents } = r
  return (
    Number.isInteger(minCents) &&
    Number.isInteger(maxCents) &&
    minCents >= 0 &&
    maxCents <= RATE_MAX_CENTS &&
    minCents <= maxCents
  )
}

/**
 * Do a family's and a nanny's ranges overlap?
 *
 * PERMISSIVE BY DESIGN: a missing (or malformed) range on either side counts as a
 * match. Rate ranges are optional and were added after launch, so accounts that
 * predate them have none — treating "unknown" as "no match" would silently empty the
 * directory for every existing user. Bounds are inclusive, so ranges that merely touch
 * ($20–25 vs $25–30) do overlap: $25 works for both.
 */
export function rangesOverlap(a?: RateRange | null, b?: RateRange | null): boolean {
  if (!isValidRange(a) || !isValidRange(b)) return true
  return a.minCents <= b.maxCents && b.minCents <= a.maxCents
}

/**
 * The window both sides accept, or null if they don't overlap (or either is missing).
 * This is what gets snapshotted onto the booking when the two sides agree.
 */
export function overlapWindow(a?: RateRange | null, b?: RateRange | null): RateRange | null {
  if (!isValidRange(a) || !isValidRange(b)) return null
  const minCents = Math.max(a.minCents, b.minCents)
  const maxCents = Math.min(a.maxCents, b.maxCents)
  return minCents <= maxCents ? { minCents, maxCents } : null
}

/** Whole dollars if even, else two decimals — "$25" / "$27.50". */
function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
}

/** Display form: "$25–35/hr", or "$30/hr" when the bounds are equal. */
export function formatRate(r?: RateRange | null): string {
  if (!isValidRange(r)) return 'Rate not set'
  const { minCents, maxCents } = r
  if (minCents === maxCents) return `${dollars(minCents)}/hr`
  return `${dollars(minCents)}–${dollars(maxCents)}/hr`
}

/**
 * Parse a dollars string from an input field into cents. Returns null when the input
 * isn't a usable amount, so callers can distinguish "empty/invalid" from "zero".
 * Accepts a leading $ and surrounding whitespace; rounds to the nearest cent.
 */
export function parseRateDollars(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '')
  if (cleaned === '') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  const cents = Math.round(value * 100)
  return cents > RATE_MAX_CENTS ? null : cents
}

/**
 * The status a new family-initiated booking should be created with (CLAUDE.md §11.1,
 * extended for rate matching). Pure, so the routing rules are unit-tested rather than
 * buried in a click handler.
 *
 * Order matters:
 *   same-day      -> same_day_review  (admin handles it personally, whatever else is true)
 *   outside hours -> pending          (existing rule: the nanny accepts or declines)
 *   rate mismatch -> pending          (NEW: same soft-downgrade, not a hard block)
 *   otherwise     -> confirmed
 *
 * A rate mismatch DOWNGRADES rather than blocking, mirroring how out-of-hours requests
 * already work: the family can still ask, and the nanny decides. Hard-filtering would
 * hide supply and could leave a family with a low range facing an empty directory.
 */
export function resolveBookingStatus(args: {
  date: string
  today: string
  withinHours: boolean
  rateOverlaps: boolean
}): BookingStatus {
  const { date, today, withinHours, rateOverlaps } = args
  if (date === today) return 'same_day_review'
  if (!withinHours) return 'pending'
  if (!rateOverlaps) return 'pending'
  return 'confirmed'
}

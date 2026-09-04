import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useOpenBookings, useBookingActions } from '../../hooks/useBookings'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Button, Card, RateDisclaimer } from '../../components/ui'
import { formatDate, formatTimeRange } from '../../lib/format'
import { formatRate } from '../../lib/rates'

/**
 * The Job Board — every unclaimed booking any nanny can pick up.
 *
 * Since the pending/accept-decline model was removed (partner meeting 2026-09), this is where ALL
 * bookings that didn't auto-confirm land: last-minute (<25h) requests, out-of-hours requests, and
 * rate-mismatch requests. A family never waits on one specific nanny; the whole network sees the
 * post and the first to claim it gets it.
 *
 * Moved here from a section on the nanny dashboard so it has room to grow and its own home in the
 * nav. Reuses the exact same data + claim machinery: useOpenBookings (status in ['open',
 * 'unmatched']) and the transactional assignNanny.
 */
export function NannyJobBoardPage() {
  const { user, profile } = useAuth()
  const open = useOpenBookings()
  const { assignNanny } = useBookingActions()
  // Per-card busy id + one error line. Per-card because a nanny claims one post at a time and
  // needs to know WHICH is mid-flight; a shared busy would grey out every card at once.
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function claim(id: string, action: () => Promise<unknown>, failure: string) {
    setPendingId(id)
    setActionError(null)
    try {
      await action()
    } catch {
      // assignNanny REJECTS when the post was already claimed. That rejection is the most
      // important message here — the card is still on screen (the snapshot hasn't caught up),
      // so without it she taps a dead job repeatedly. The copy names what happened.
      setActionError(failure)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Job Board"
        subtitle="Open bookings any nanny can pick up — last-minute and out-of-hours requests. First to accept gets it."
      />
      <PageBody>
        {open.length === 0 ? (
          <Card tone="sage" className="text-center">
            <p className="font-display text-display-md text-ll-ink">No open bookings right now</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ll-warm-gray">
              When a family needs a sitter last-minute or outside your set hours, the request shows
              up here for you to claim.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {open.some((b) => typeof b.rateMinCents === 'number') && <RateDisclaimer className="mb-1" />}
            {open.map((b) => (
              <Card
                key={b.id}
                tone="sage"
                interactive
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-display-sm leading-none text-ll-ink">{b.familyName}</p>
                  <p className="mt-1 font-mono text-mono-sm text-ll-warm-gray">
                    {formatDate(b.date)} · {formatTimeRange(b.startTime, b.endTime)} · {b.address}
                  </p>
                  {typeof b.rateMinCents === 'number' && typeof b.rateMaxCents === 'number' && (
                    <p className="mt-1 font-mono text-mono-sm text-ll-ink">
                      {formatRate({ minCents: b.rateMinCents, maxCents: b.rateMaxCents })}
                    </p>
                  )}
                  {b.notes && <p className="mt-1 text-sm text-ll-warm-gray">“{b.notes}”</p>}
                </div>
                {/*
                  `b` is passed as meta: assignNanny's email branch is guarded on receiving it, so
                  without it the booking flips to confirmed and the family is told nothing. An open
                  post has no nanny attached, so open_booking_picked_up is the only thing that tells
                  the family someone is coming.
                */}
                <Button
                  size="sm"
                  disabled={pendingId === b.id || !user || !profile}
                  onClick={() =>
                    user &&
                    profile &&
                    claim(
                      b.id,
                      () => assignNanny(b.id, user.uid, profile.fullName, b),
                      `Another nanny got to ${b.familyName}’s booking first — it’s no longer available. Have a look at the other open bookings.`,
                    )
                  }
                >
                  Accept this booking
                </Button>
              </Card>
            ))}
          </div>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-6 rounded-ll-input border-1.5 border-red-400 bg-white px-4 py-3 text-sm font-semibold text-red-600"
          >
            {actionError}
          </p>
        )}
      </PageBody>
    </>
  )
}

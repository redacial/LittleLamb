import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNanny } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Avatar, Badge, Button, RateDisclaimer } from '../../components/ui'
import { formatRate } from '../../lib/rates'
import { badgeLabel, badgeType } from '../../lib/badges'
import { DAYS } from '../../components/onboarding/AvailabilityEditor'
import { to12h } from '../../lib/format'

/**
 * Full nanny profile — shared by families and nannies. Booking buttons show for families only.
 *
 * CLAUDE.md §11.2 Path B also specs a "Request outside hours" CTA here. It is deliberately NOT
 * rendered yet. It previously existed as a secondary button with no onClick, which is the worst
 * of the three options: a family looking at a nanny whose posted hours don't fit would click the
 * button built for exactly that case and get nothing — no modal, no error, no navigation. On the
 * surface whose entire job is turning interest into a booking, that reads as a broken site and
 * loses the booking silently.
 *
 * A real implementation needs, roughly:
 *   1. A modal collecting date + start/end time, pre-filled with a message the family can edit
 *      (per the spec), validated against the same rules as the calendar booking flow.
 *   2. A booking write that creates the request with status 'pending' and nannyId set — the
 *      out-of-hours path, distinct from the auto-confirm path used when the slot is inside the
 *      nanny's availability. That write lives in the booking hook another agent owns.
 *   3. Notification on create: the nanny gets an accept/decline email, the family an
 *      "awaiting reply" (CLAUDE.md §19). The accept/decline handling already exists on the
 *      nanny Bookings page, so this only needs the request side.
 *   4. Same-day guard: a same-day request routes to admin instead of the nanny (§11.5).
 *
 * Until that exists, families use "Book this nanny", which lands on the calendar with the nanny
 * preselected and works today.
 */
export function NannyProfilePage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { nanny, loading } = useNanny(id)
  const canBook = profile?.role === 'family'

  if (loading) return <PageBody><p className="text-ll-warm-gray">Loading…</p></PageBody>
  if (!nanny) return <PageBody><p>Profile not found.</p></PageBody>

  return (
    <>
      <PageHeader
        title={nanny.fullName}
        subtitle={nanny.yearsExperience ? `${nanny.yearsExperience} years of experience` : undefined}
        action={
          canBook ? (
            <Link to={`/family/calendar?nanny=${nanny.uid}`}>
              <Button>Book this nanny</Button>
            </Link>
          ) : undefined
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <Card tone="peri">
              <div className="flex items-center gap-4">
                <Avatar name={nanny.fullName} src={nanny.photoURL} size="lg" />
                <div>
                  <p className="font-display text-2xl text-ll-ink">{nanny.fullName}</p>
                  <p className="text-sm text-ll-warm-gray">Santa Barbara</p>
                </div>
              </div>

              {/* Trust signals above the fold — the most important content on this surface. */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="trust-chip">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M8 1l5.5 2v4c0 3.4-2.3 6.6-5.5 8-3.2-1.4-5.5-4.6-5.5-8V3L8 1z" />
                  </svg>
                  Background checked
                </span>
                <span className="trust-chip">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M8 1l5.5 2v4c0 3.4-2.3 6.6-5.5 8-3.2-1.4-5.5-4.6-5.5-8V3L8 1z" />
                  </svg>
                  Admin interviewed
                </span>
                {nanny.yearsExperience && (
                  <span className="trust-chip">{nanny.yearsExperience} yrs experience</span>
                )}
              </div>

              {nanny.introVideoURL && (
                <video src={nanny.introVideoURL} controls className="mt-4 w-full rounded-ll-input bg-ll-cream-dark" />
              )}
            </Card>

            <Card>
              <CardLabel>Badges</CardLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nanny.verifiedBadges.map((b) => (
                  <Badge key={b} label={badgeLabel(b)} type="verified" size="sm" />
                ))}
                {nanny.selfBadges.map((b) => (
                  <Badge key={b} label={badgeLabel(b)} type={badgeType(b)} size="sm" />
                ))}
                {nanny.verifiedBadges.length + nanny.selfBadges.length === 0 && (
                  <p className="text-sm text-ll-warm-gray">No badges yet.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardLabel>About</CardLabel>
              <p className="mt-1 whitespace-pre-line text-ll-ink">{nanny.bio}</p>
            </Card>

            {nanny.rateRange && (
              <Card>
                <CardLabel>Hourly rate</CardLabel>
                <p className="mt-1 font-mono text-ll-ink">{formatRate(nanny.rateRange)}</p>
                <RateDisclaimer className="mt-2" />
              </Card>
            )}

            <Card>
              <CardLabel>Weekly availability</CardLabel>
              <ul className="mt-2 divide-y divide-ll-cream-dark">
                {DAYS.map((label, day) => {
                  const block = nanny.availability?.find((a) => a.day === day)
                  return (
                    <li key={label} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold text-ll-ink">{label}</span>
                      <span className={block ? 'font-mono text-ll-ink' : 'text-ll-warm-gray'}>
                        {block ? `${to12h(block.start)} – ${to12h(block.end)}` : 'Unavailable'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card tone="peri">
              <CardLabel>Families worked with</CardLabel>
              <p className="mt-2 font-mono text-mono-sm text-ll-peri-deep">
                Worked with families on Little Lamb
              </p>
              <p className="mt-1 text-sm text-ll-warm-gray">
                A trust signal that grows as this nanny completes bookings on the platform.
              </p>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  )
}

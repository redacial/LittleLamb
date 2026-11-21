import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNanny, type DirectoryNanny } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Avatar, Badge, Button, RateDisclaimer } from '../../components/ui'
import { IntroVideo } from '../../components/IntroVideo'
import { AvailabilityNotepad } from '../../components/AvailabilityNotepad'
import { formatRate } from '../../lib/rates'
import { badgeLabel, badgeType } from '../../lib/badges'
import { optionLabel, experienceLabel } from '../../lib/nannyProfileOptions'
import { composeFunFact } from '../../lib/funFact'

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
/**
 * The route-level profile page: `/{role}/nannies/:id`. A thin wrapper that reads the id from the
 * URL, fetches the nanny, and renders the shared <NannyProfilePane> full-screen with a PageHeader.
 *
 * This route is the MOBILE path (tapping a directory card on a phone navigates here for a
 * full-screen read) and the deep-link / shared-URL / right-click-open path. On desktop the same
 * pane is embedded in the directory's right column instead (see NanniesDirectory), where it is
 * handed the already-loaded nanny object as a prop — no second fetch.
 */
export function NannyProfilePage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { nanny, loading } = useNanny(id)
  const canBook = profile?.role === 'family'

  if (loading) return <PageBody><p className="text-ll-warm-gray">Loading…</p></PageBody>
  if (!nanny) return <PageBody><p>Profile not found.</p></PageBody>

  // The pane owns the name + experience + Book CTA (so the embedded directory version has them),
  // so the route wrapper renders a minimal breadcrumb-style PageHeader WITHOUT a duplicate Book
  // action — just a back link to the directory.
  return (
    <>
      <PageHeader
        title="Sitter profile"
        action={
          <Link to={`/${canBook ? 'family' : 'nanny'}/nannies`}>
            <Button variant="secondary">Back to sitters</Button>
          </Link>
        }
      />
      <PageBody>
        <NannyProfilePane nanny={nanny} canBook={canBook} />
      </PageBody>
    </>
  )
}

/** Prefer the selected experience band (new onboarding); fall back to legacy free-text years. */
function experienceOf(nanny: DirectoryNanny): string {
  return nanny.experienceBand
    ? experienceLabel(nanny.experienceBand)
    : nanny.yearsExperience
      ? `${nanny.yearsExperience} years`
      : ''
}

/**
 * The full nanny profile, driven entirely by a `nanny` PROP (no route, no fetch) so it can be
 * rendered two ways: full-screen by the route wrapper above, or embedded in the directory's
 * right-side pane on desktop. It carries its OWN name/experience/Book heading (the route wrapper's
 * PageHeader repeats the name on the full-screen path, which is fine — the pane heading is what the
 * embedded version needs).
 */
export function NannyProfilePane({ nanny, canBook }: { nanny: DirectoryNanny; canBook: boolean }) {
  const experienceText = experienceOf(nanny)
  const aboutGroups: { label: string; ids: string[] }[] = [
    { label: 'Great with', ids: nanny.specialties ?? [] },
    { label: 'Activities', ids: nanny.activities ?? [] },
    { label: 'Approach', ids: nanny.approaches ?? [] },
    { label: 'Languages', ids: nanny.languages ?? [] },
  ].filter((g) => g.ids.length > 0)

  return (
    <div>
      {/* Pane heading: name + experience + the Book CTA. On the embedded (desktop pane) path this
          is the only heading; on the full-screen route the PageHeader also shows the name. */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-display-md leading-none text-ll-ink">{nanny.fullName}</h2>
          {experienceText && (
            <p className="mt-1 text-sm text-ll-warm-gray">{experienceText} of experience</p>
          )}
        </div>
        {canBook && (
          <Link to={`/family/calendar?nanny=${nanny.uid}`}>
            <Button>Book this nanny</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <Card tone="peri">
              <div className="flex items-center gap-4">
                <Avatar name={nanny.fullName} src={nanny.photoURL} size="lg" />
                <div>
                  <p className="font-display text-2xl text-ll-ink">{nanny.fullName}</p>
                  {composeFunFact(nanny.funFactPrompt, nanny.funFact) ? (
                    <p className="text-sm font-medium text-ll-ink">
                      {composeFunFact(nanny.funFactPrompt, nanny.funFact)}
                    </p>
                  ) : (
                    <p className="text-sm text-ll-warm-gray">Santa Barbara</p>
                  )}
                </div>
              </div>

              {/* Facts above the fold. No "background checked / interviewed" claim — Little Lamb
                  is a listing service and verifies nothing (D77); the sitter's own credentials
                  are the self-reported badges below. */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="trust-chip">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .8 4.3L8 11.4 4.1 13.4l.8-4.3-3.1-3 4.3-.6L8 1.6z" />
                  </svg>
                  Santa Barbara local
                </span>
                {experienceText && (
                  <span className="trust-chip">{experienceText} experience</span>
                )}
              </div>

              {nanny.introVideoURL && (
                <IntroVideo src={nanny.introVideoURL} name={nanny.fullName} className="mt-4" />
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
              {nanny.verifiedBadges.length + nanny.selfBadges.length > 0 && (
                <p className="mt-2 text-xs text-ll-warm-gray">
                  Self-reported by the sitter — not verified by Little Lamb.
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {nanny.bio && (
              <Card>
                <CardLabel>About</CardLabel>
                <p className="mt-1 whitespace-pre-line text-ll-ink">{nanny.bio}</p>
              </Card>
            )}

            {aboutGroups.length > 0 && (
              <Card className="space-y-3">
                {aboutGroups.map((g) => (
                  <div key={g.label}>
                    <CardLabel>{g.label}</CardLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.ids.map((cid) => (
                        <span
                          key={cid}
                          className="rounded-full border-1.5 border-ll-sage bg-ll-sage-light px-3 py-1 font-mono text-mono-sm font-medium text-ll-sage-deep"
                        >
                          {optionLabel(cid)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {nanny.rateRange && (
              <Card>
                <CardLabel>Hourly rate</CardLabel>
                <p className="mt-1 font-mono text-ll-ink">{formatRate(nanny.rateRange)}</p>
                <RateDisclaimer className="mt-2" />
              </Card>
            )}

            {/* Availability as a lined notepad (cozy aesthetic) rather than a plain card. */}
            <AvailabilityNotepad availability={nanny.availability} />

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
    </div>
  )
}

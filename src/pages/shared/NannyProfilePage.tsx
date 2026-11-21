import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNanny, type DirectoryNanny } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { CardLabel, Badge, Button, Avatar, RateDisclaimer } from '../../components/ui'
import { StickyNote } from '../../components/theme'
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

  const allBadges = [...nanny.verifiedBadges, ...nanny.selfBadges]
  const funFact = composeFunFact(nanny.funFactPrompt, nanny.funFact)

  return (
    // Care.com-style profile pane (David's reference). The pane SCROLLS on lg: the top block
    // (photo + name + chips, the experience|rate stat box, Book, and video + availability) sits
    // above the fold; everything else (bio, about chips, badges) is below and reached by scrolling
    // the pane. On the full-screen mobile route the height cap is lg-only, so it flows naturally.
    <div className="rounded-ll-card border-1.5 border-ll-sand bg-ll-paper shadow-soft lg:h-full lg:overflow-y-auto">
      <div className="space-y-5 p-5">
        {/* ── Above the fold ─────────────────────────────────────────────── */}

        {/* Identity: photo + name/chips on the left, the hourly-rate sticky note on the right. */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={nanny.fullName} src={nanny.photoURL} size="lg" />
            <div className="min-w-0">
              <h2 className="font-display text-display-md leading-none text-ll-ink">{nanny.fullName}</h2>
              {experienceText && <p className="mt-1 text-sm text-ll-warm-gray">{experienceText} of experience</p>}
              {funFact && <p className="mt-1 text-sm font-medium text-ll-ink line-clamp-1">{funFact}</p>}
              {/* Compliant chips — "Santa Barbara local" + self-reported credentials. NEVER a
                  "background checked" claim (D77: Little Lamb verifies nothing). */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="trust-chip">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .8 4.3L8 11.4 4.1 13.4l.8-4.3-3.1-3 4.3-.6L8 1.6z" />
                  </svg>
                  Santa Barbara local
                </span>
              </div>
            </div>
          </div>
          {/* Hourly rate as a sticky note, top-right next to the name (David). */}
          {nanny.rateRange && (
            <StickyNote tone="butter" rotate={-2} className="shrink-0 px-4 py-2 text-center">
              <p className="eyebrow leading-none">Rate</p>
              <p className="mt-0.5 font-display text-2xl leading-tight text-ll-ink">
                {formatRate(nanny.rateRange)}
              </p>
            </StickyNote>
          )}
        </div>

        {/* Book — full-width primary, like Care.com's "Contact" button. */}
        {canBook && (
          <Link to={`/family/calendar?nanny=${nanny.uid}`} className="block">
            <Button className="w-full">Book this nanny</Button>
          </Link>
        )}

        {/* Video + availability side by side — both visible without scrolling. */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="min-w-0">
            {nanny.introVideoURL ? (
              <IntroVideo src={nanny.introVideoURL} name={nanny.fullName} className="w-full" />
            ) : (
              <div className="grid h-full min-h-[8rem] place-items-center rounded-ll-input border-1.5 border-dashed border-ll-sand text-sm text-ll-warm-gray">
                No intro video yet
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-4">
            <AvailabilityNotepad availability={nanny.availability} />
            {/* The bio on its own scratch-paper notepad, underneath the availability (David). The
                ruled lines live on the text element itself with NO vertical padding, so each rule
                lands on a text line (padding would push the text out of phase with the gradient). */}
            {nanny.bio && (
              <div className="overflow-hidden rounded-ll-card border-1.5 border-ll-sand bg-ll-paper shadow-soft">
                <div className="border-b-1.5 border-dashed border-ll-sand bg-ll-note-blush/60 px-5 py-3">
                  <span className="font-display text-2xl leading-none text-ll-ink">
                    About {nanny.fullName.split(' ')[0]}
                  </span>
                </div>
                <div className="px-5 pb-4 pt-2">
                  <p className="scratch-lines whitespace-pre-line text-ll-ink">{nanny.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Below the fold (scroll) ────────────────────────────────────── */}
        {/* Bio now lives on its own scratch-paper notepad above (next to availability). */}

        {aboutGroups.length > 0 && (
          <div className="space-y-3">
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
          </div>
        )}

        {/* Credentials — mirrors Care.com's honest framing, which happens to match our legal
            stance exactly (D77): Little Lamb does not verify credentials; families ask for proof. */}
        <div className="border-t-1.5 border-ll-sand pt-4">
          <CardLabel>Credentials</CardLabel>
          <p className="mt-1 text-sm text-ll-warm-gray">
            Little Lamb does not verify credentials. We recommend asking sitters for proof.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allBadges.map((b) => (
              <Badge key={b} label={badgeLabel(b)} type={badgeType(b)} size="sm" />
            ))}
            {allBadges.length === 0 && (
              <span className="text-sm text-ll-warm-gray">None listed yet.</span>
            )}
          </div>
          {nanny.rateRange && <RateDisclaimer className="mt-3" />}
        </div>
      </div>
    </div>
  )
}

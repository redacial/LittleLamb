import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNannyDirectory } from '../../hooks/useNannies'
import { useFamilyProfile } from '../../hooks/useProfile'
import { useMediaQuery, LG_QUERY } from '../../hooks/useMediaQuery'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, RateDisclaimer, LoadErrorNotice, TruncatedNotice } from '../../components/ui'
import { NannyListCard } from '../../components/NannyListCard'
import { NannyProfilePane } from './NannyProfilePage'

/**
 * Shared directory of approved nannies, as a master-detail view:
 *  - LEFT: a horizontally-scrolling strip of nanny cards.
 *  - RIGHT (desktop, lg+): the full profile of the selected sitter, IN PLACE — no navigation.
 *    Selection lives in the URL as `?selected=<uid>` so it is deep-linkable and the browser Back
 *    button steps through selections. The selected nanny is resolved from the already-loaded
 *    directory list — there is NO second fetch, which also sidesteps useNanny's missing error path.
 *  - MOBILE (below lg): there's no room for a side-by-side pane, so a card tap NAVIGATES to the
 *    full-screen profile route (/{role}/nannies/:id) instead. We achieve this by passing `onSelect`
 *    to the cards ONLY at lg+; below lg the cards fall back to their plain navigating links.
 *
 * One component serves families and nannies (role decides `canBook` and the /family vs /nanny link
 * prefix). Nannies browse peers for community visibility (no Book button).
 */
export function NanniesDirectory() {
  const { user, profile } = useAuth()
  const { nannies, loading, error, truncated } = useNannyDirectory()
  const canBook = profile?.role === 'family'
  const base = profile?.role === 'nanny' ? '/nanny' : '/family'
  const isDesktop = useMediaQuery(LG_QUERY)

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('selected')
  // Resolve from the in-memory list — never re-fetch. Null when nothing is selected or the id is
  // stale (e.g. a shared link to a sitter who has since left).
  const selected = selectedId ? (nannies.find((n) => n.uid === selectedId) ?? null) : null

  // Only families have a budget to compare against; nannies browsing see rates plainly.
  const { profile: family } = useFamilyProfile(canBook ? user?.uid : undefined)
  const budget = family?.rateRange

  // Desktop: open in the right pane (push ?selected=, keeping Back). Mobile: omit onSelect so the
  // card's own link navigates to the full-screen route.
  const onSelect = isDesktop
    ? (uid: string) => setSearchParams({ selected: uid }, { replace: false })
    : undefined

  return (
    <>
      <PageHeader
        title="Our sitters"
        subtitle="Browse local sitters and nannies. You choose, interview, and book whoever fits your family."
      />
      <PageBody>
        {error && <LoadErrorNotice what="the nanny directory" />}

        {!error && loading && <p className="text-ll-warm-gray">Loading sitters…</p>}

        {!error && !loading && nannies.length === 0 && (
          <Card tone="peri" className="text-center">
            <p className="font-display text-display-md text-ll-ink">No sitters yet — but they’re coming</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ll-warm-gray">
              Local sitters are joining the board right now. Check back soon to meet them.
            </p>
          </Card>
        )}

        {!error && !loading && nannies.length > 0 && (
          <>
            {truncated && (
              <div className="mb-4">
                <TruncatedNotice shown={nannies.length} what="nannies" />
              </div>
            )}
            {nannies.some((n) => n.rateRange) && <RateDisclaimer className="mb-4" />}

            {/* Master-detail, Care.com-style: a VERTICAL stack of WIDE result cards on the left
                that scrolls on its own, and a FIXED profile pane on the right. Only the left
                column scrolls; the page itself never moves. Below lg it's a single column and a
                card tap navigates to the full-screen route instead (onSelect omitted there). */}
            <div className="lg:grid lg:h-[calc(100vh-9.5rem)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6">
              {/* LEFT — wide Care.com-style cards, scrolls internally on lg. */}
              <div className="min-w-0 lg:h-full lg:overflow-y-auto lg:pr-2">
                <ul className="space-y-4">
                  {nannies.map((n) => (
                    <li key={n.uid}>
                      <NannyListCard
                        nanny={n}
                        profileBase={base}
                        budget={budget}
                        selected={n.uid === selectedId}
                        onSelect={onSelect}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {/* RIGHT — the fixed profile pane on desktop; empty space (no filler) when nothing
                  is picked. */}
              <aside className="hidden min-w-0 lg:block lg:h-full">
                {selected ? (
                  <NannyProfilePane nanny={selected} canBook={!!canBook} />
                ) : (
                  // Intentionally empty — per spec there is no filler when no profile is open.
                  <div
                    aria-hidden
                    className="h-full rounded-ll-card border-1.5 border-dashed border-ll-sand/70"
                  />
                )}
              </aside>
            </div>
          </>
        )}
      </PageBody>
    </>
  )
}

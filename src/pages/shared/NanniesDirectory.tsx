import { useAuth } from '../../context/AuthContext'
import { useNannyDirectory } from '../../hooks/useNannies'
import { useFamilyProfile } from '../../hooks/useProfile'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, RateDisclaimer, LoadErrorNotice, TruncatedNotice } from '../../components/ui'
import { NannyCard } from '../../components/NannyCard'

/**
 * Shared directory of approved nannies. Families can book; nannies see the same page with
 * booking buttons hidden (community visibility per spec). The role comes from the profile,
 * so one component serves both — no duplicated screen.
 */
export function NanniesDirectory() {
  const { user, profile } = useAuth()
  const { nannies, loading, error, truncated } = useNannyDirectory()
  const canBook = profile?.role === 'family'
  const base = profile?.role === 'nanny' ? '/nanny' : '/family'
  // Only families have a budget to compare against; nannies browsing see rates plainly.
  const { profile: family } = useFamilyProfile(canBook ? user?.uid : undefined)
  const budget = family?.rateRange

  return (
    <>
      <PageHeader title="Our nannies" subtitle="Every nanny here is interviewed and background-checked." />
      <PageBody>
        {loading ? (
          <p className="text-ll-warm-gray">Loading nannies…</p>
        ) : error ? (
          // "We couldn't load this" — never the "no nannies yet" empty state below, which
          // would tell a family the network is empty when it simply failed to read.
          <LoadErrorNotice what="the nanny directory" />
        ) : nannies.length === 0 ? (
          <Card tone="peri" className="text-center">
            <p className="font-display text-display-md text-ll-ink">No nannies yet — but they’re coming</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ll-warm-gray">
              We’re interviewing and background-checking nannies right now. Check back soon to meet the team.
            </p>
          </Card>
        ) : (
          <>
          {/* One disclaimer for the whole grid — repeating it on every card would be
              noise, but it must appear wherever rates are shown. */}
          {truncated && (
            <div className="mb-4">
              <TruncatedNotice shown={nannies.length} what="nannies" />
            </div>
          )}
          {nannies.some((n) => n.rateRange) && <RateDisclaimer className="mb-4" />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {nannies.map((n) => (
              <NannyCard
                key={n.uid}
                nanny={n}
                profileBase={base}
                canBook={canBook}
                budget={budget}
              />
            ))}
          </div>
          </>
        )}
      </PageBody>
    </>
  )
}

import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNannyDirectory } from '../../hooks/useNannies'
import { useFamilyProfile } from '../../hooks/useProfile'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, Avatar, Badge, Button, RateDisclaimer } from '../../components/ui'
import { badgeType, badgeLabel } from '../../lib/badges'
import { formatRate, rangesOverlap } from '../../lib/rates'

/**
 * Shared directory of approved nannies. Families can book; nannies see the same page with
 * booking buttons hidden (community visibility per spec). The role comes from the profile,
 * so one component serves both — no duplicated screen.
 */
export function NanniesDirectory() {
  const { user, profile } = useAuth()
  const { nannies, loading } = useNannyDirectory()
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
          {nannies.some((n) => n.rateRange) && <RateDisclaimer className="mb-4" />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {nannies.map((n) => {
              const badges = [...n.verifiedBadges, ...n.selfBadges].slice(0, 4)
              // Soft signal, never a filter: an out-of-budget nanny stays listed and
              // bookable, just labelled, so families keep full visibility of supply.
              const outOfBudget = canBook && !!budget && !rangesOverlap(budget, n.rateRange)
              return (
                <Card
                  key={n.uid}
                  tone="peri"
                  interactive
                  className="flex flex-col"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={n.fullName} src={n.photoURL} size="md" />
                    <div>
                      <p className="font-display text-lg text-ll-ink">{n.fullName}</p>
                      <p className="text-sm text-ll-warm-gray">
                        {n.availability?.length ? `Available ${n.availability.length} days/wk` : 'Availability on profile'}
                      </p>
                    </div>
                  </div>

                  {/* Trust signals first — background check / verification, then experience. */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="trust-chip">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                        <path d="M8 1l5.5 2v4c0 3.4-2.3 6.6-5.5 8-3.2-1.4-5.5-4.6-5.5-8V3L8 1z" />
                      </svg>
                      Background checked
                    </span>
                    {n.yearsExperience && (
                      <span className="trust-chip">{n.yearsExperience} yrs experience</span>
                    )}
                  </div>

                  {n.rateRange && (
                    <div className="mt-3">
                      <p className="font-mono text-mono-sm text-ll-ink">
                        {formatRate(n.rateRange)}
                      </p>
                      {outOfBudget && (
                        <p className="mt-1 inline-flex rounded-ll-tag border-1.5 border-ll-terra-deep bg-ll-terra-light px-2 py-0.5 text-sm text-ll-ink">
                          Outside your budget — you can still ask
                        </p>
                      )}
                    </div>
                  )}

                  {badges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {badges.map((b) => (
                        <Badge key={b} label={badgeLabel(b)} type={badgeType(b)} size="sm" />
                      ))}
                    </div>
                  )}

                  <p className="mt-3 font-mono text-mono-sm text-ll-peri-deep">Worked with families on Little Lamb</p>
                  <p className="mt-2 line-clamp-2 text-sm text-ll-warm-gray">{n.bio}</p>

                  <div className="mt-4 flex gap-2">
                    <Link to={`${base}/nannies/${n.uid}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">View profile</Button>
                    </Link>
                    {canBook && (
                      <Link to={`/family/calendar?nanny=${n.uid}`} className="flex-1">
                        <Button size="sm" className="w-full">Book</Button>
                      </Link>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
          </>
        )}
      </PageBody>
    </>
  )
}

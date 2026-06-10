import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNanny } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Avatar, Badge, Button } from '../../components/ui'
import { badgeLabel, badgeType } from '../../lib/badges'
import { DAYS } from '../../components/onboarding/AvailabilityEditor'
import { to12h } from '../../lib/format'

/** Full nanny profile — shared by families and nannies. Booking buttons show for families only. */
export function NannyProfilePage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { nanny, loading } = useNanny(id)
  const canBook = profile?.role === 'family'

  if (loading) return <PageBody><p className="text-charcoal-muted">Loading…</p></PageBody>
  if (!nanny) return <PageBody><p>Profile not found.</p></PageBody>

  return (
    <>
      <PageHeader
        title={nanny.fullName}
        subtitle={nanny.yearsExperience ? `${nanny.yearsExperience} years of experience` : undefined}
        action={
          canBook ? (
            <div className="flex gap-2">
              <Link to={`/family/calendar?nanny=${nanny.uid}`}>
                <Button>Book this nanny</Button>
              </Link>
              <Button variant="secondary">Request outside hours</Button>
            </div>
          ) : undefined
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-4">
                <Avatar name={nanny.fullName} src={nanny.photoURL} size="lg" />
                <div>
                  <p className="font-display text-2xl">{nanny.fullName}</p>
                  <p className="text-sm text-charcoal-muted">Santa Barbara</p>
                </div>
              </div>
              {nanny.introVideoURL && (
                <video src={nanny.introVideoURL} controls className="mt-4 w-full rounded-xl bg-charcoal/5" />
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
                  <p className="text-sm text-charcoal-muted">No badges yet.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardLabel>About</CardLabel>
              <p className="mt-1 whitespace-pre-line text-charcoal">{nanny.bio}</p>
            </Card>

            <Card>
              <CardLabel>Weekly availability</CardLabel>
              <ul className="mt-2 divide-y divide-charcoal/5">
                {DAYS.map((label, day) => {
                  const block = nanny.availability?.find((a) => a.day === day)
                  return (
                    <li key={label} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold">{label}</span>
                      <span className={block ? 'text-charcoal' : 'text-charcoal-faint'}>
                        {block ? `${to12h(block.start)} – ${to12h(block.end)}` : 'Unavailable'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card>
              <CardLabel>Families worked with</CardLabel>
              <p className="mt-1 text-sm text-charcoal-muted">
                A trust signal that grows as this nanny completes bookings on the platform.
              </p>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  )
}

import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNannyDirectory } from '../../hooks/useNannies'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, Avatar, Badge, Button } from '../../components/ui'
import { badgeType, badgeLabel } from '../../lib/badges'

/**
 * Shared directory of approved nannies. Families can book; nannies see the same page with
 * booking buttons hidden (community visibility per spec). The role comes from the profile,
 * so one component serves both — no duplicated screen.
 */
export function NanniesDirectory() {
  const { profile } = useAuth()
  const { nannies, loading } = useNannyDirectory()
  const canBook = profile?.role === 'family'
  const base = profile?.role === 'nanny' ? '/nanny' : '/family'

  return (
    <>
      <PageHeader title="Our nannies" subtitle="Every nanny here is interviewed and background-checked." />
      <PageBody>
        {loading ? (
          <p className="text-charcoal-muted">Loading nannies…</p>
        ) : nannies.length === 0 ? (
          <Card className="bg-cream-100">
            <p className="text-sm text-charcoal-muted">No nannies are live in the network yet.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {nannies.map((n) => {
              const badges = [...n.verifiedBadges, ...n.selfBadges].slice(0, 4)
              return (
                <Card key={n.uid} className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <Avatar name={n.fullName} src={n.photoURL} size="md" />
                    <div>
                      <p className="font-display text-lg">{n.fullName}</p>
                      <p className="text-sm text-charcoal-muted">
                        {n.availability?.length ? `Available ${n.availability.length} days/wk` : 'Availability on profile'}
                      </p>
                    </div>
                  </div>
                  {badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {badges.map((b) => (
                        <Badge key={b} label={badgeLabel(b)} type={badgeType(b)} size="sm" />
                      ))}
                    </div>
                  )}
                  <p className="mt-3 line-clamp-2 text-sm text-charcoal-muted">{n.bio}</p>
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
        )}
      </PageBody>
    </>
  )
}

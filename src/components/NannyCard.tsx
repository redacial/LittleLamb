import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge, Button } from './ui'
import { badgeType, badgeLabel } from '../lib/badges'
import { formatRate, rangesOverlap } from '../lib/rates'
import { useTiltHover } from '../lib/motion'
import { cn } from '../lib/cn'
import type { DirectoryNanny } from '../hooks/useNannies'
import type { RateRange } from '../types'

/** One line, so it reads as a photo caption rather than a second bio. Mirrors the rules guard. */
export const FUN_FACT_MAX = 120

interface NannyCardProps {
  nanny: DirectoryNanny
  /** Where "View profile" and the card itself link (role-prefixed: /family or /nanny). */
  profileBase: string
  /** Families can book; nannies browsing peers cannot (community visibility per spec). */
  canBook: boolean
  /** The family's budget ceiling, when known — drives the soft out-of-budget label. */
  budget?: RateRange
}

/**
 * Directory card for one nanny. A big photo carries the personality (name + fun fact over a
 * bottom gradient scrim); the trust strip, badges and rate sit BELOW the photo in a rigid,
 * identical layout on every card so families can compare at a glance.
 *
 * Why trust-below-photo rather than on it: NN/G's marketplace-trust research (and this project's
 * own DESIGN_SYSTEM.md §Trust Signal Hierarchy) puts "background checked / interviewed" as the
 * single most important signal on a nanny surface. Overlaid on a photo it would have to survive
 * whatever a user uploads; as a solid chip below, its contrast is guaranteed. The photo sells the
 * person, the strip earns the trust — and "years of experience" reads as professional where a raw
 * age would read as a dating app.
 */
export function NannyCard({ nanny, profileBase, canBook, budget }: NannyCardProps) {
  const hover = useTiltHover()
  const href = `${profileBase}/nannies/${nanny.uid}`
  const badges = [...nanny.verifiedBadges, ...nanny.selfBadges].slice(0, 4)
  // Soft signal, never a filter: an out-of-budget nanny stays listed and bookable, just labelled,
  // so families keep full visibility of supply.
  const outOfBudget = canBook && !!budget && !rangesOverlap(budget, nanny.rateRange)

  return (
    <motion.article
      {...hover}
      className="group flex flex-col overflow-hidden rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream-dark shadow-soft transition-shadow hover:shadow-pop-peri"
    >
      {/* Photo + overlaid identity. The whole photo links to the profile (large target, Fitts). */}
      <Link to={href} className="relative block aspect-[4/5] overflow-hidden focus-visible:outline-none">
        {nanny.photoURL ? (
          <img
            src={nanny.photoURL}
            alt={`${nanny.fullName}, nanny`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          // Real photo is mandatory per the design system; this is only the pre-upload fallback.
          <div className="grid h-full w-full place-items-center bg-ll-sage-light">
            <span aria-hidden className="font-display text-6xl text-ll-sage-deep">
              {initials(nanny.fullName)}
            </span>
          </div>
        )}
        {/* Bottom-anchored scrim so white text clears 4.5:1 on any upload (NN/G text-over-image). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-display text-2xl leading-tight text-white drop-shadow-sm">
            {nanny.fullName}
          </p>
          {nanny.funFact && (
            <p className="mt-0.5 line-clamp-2 text-sm font-medium text-white/95 drop-shadow-sm">
              {nanny.funFact}
            </p>
          )}
        </div>
      </Link>

      {/* Trust + facts, identical layout on every card for scannable comparison. */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="trust-chip">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="M8 1l5.5 2v4c0 3.4-2.3 6.6-5.5 8-3.2-1.4-5.5-4.6-5.5-8V3L8 1z" />
            </svg>
            Background checked
          </span>
          {nanny.yearsExperience && (
            <span className="trust-chip">{nanny.yearsExperience} yrs experience</span>
          )}
        </div>

        {nanny.rateRange && (
          <div className="mt-3">
            <p className="font-mono text-mono-sm text-ll-ink">{formatRate(nanny.rateRange)}</p>
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

        <p className={cn('mt-3 line-clamp-2 text-sm text-ll-warm-gray', badges.length === 0 && 'mt-2')}>
          {nanny.bio}
        </p>

        <div className="mt-4 flex gap-2 pt-1">
          <Link to={href} className="flex-1" tabIndex={-1}>
            <Button variant="secondary" size="sm" className="w-full">View profile</Button>
          </Link>
          {canBook && (
            <Link to={`/family/calendar?nanny=${nanny.uid}`} className="flex-1">
              <Button size="sm" className="w-full">Book</Button>
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  )
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

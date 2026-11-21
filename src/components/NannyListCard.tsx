import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge } from './ui'
import { badgeType, badgeLabel } from '../lib/badges'
import { experienceLabel } from '../lib/nannyProfileOptions'
import { formatRate, rangesOverlap } from '../lib/rates'
import { useTiltHover } from '../lib/motion'
import { cn } from '../lib/cn'
import type { DirectoryNanny } from '../hooks/useNannies'
import type { RateRange } from '../types'

interface NannyListCardProps {
  nanny: DirectoryNanny
  /** Role-prefixed profile route base (/family or /nanny) — the mobile / deep-link destination. */
  profileBase: string
  /** The family's budget ceiling, when known — drives the soft out-of-budget label. */
  budget?: RateRange
  /** The row currently open in the detail pane (desktop) — gets a highlighted border. */
  selected?: boolean
  /**
   * Master-detail (desktop): open the profile in the pane IN PLACE. The `to={href}` stays for the
   * mobile full-screen route, right-click-open and deep links; onSelect just intercepts a plain
   * left-click. The directory passes it only at lg+.
   */
  onSelect?: (uid: string) => void
}

/**
 * A wide directory card, laid out like Care.com's search results (David's reference): a square
 * photo on the left; name + experience + a credential chip beside it; the rate in the top-right
 * ("from $X / per hour"); a bio snippet across the bottom. Several stack in the scrolling left
 * column. No "background checked" claim (D77) — Little Lamb verifies nothing; chips are the
 * sitter's own self-reported credentials, and we have no public rating/location to show.
 */
export function NannyListCard({ nanny, profileBase, budget, selected, onSelect }: NannyListCardProps) {
  const hover = useTiltHover()
  const href = `${profileBase}/nannies/${nanny.uid}`
  const experienceText = nanny.experienceBand
    ? `${experienceLabel(nanny.experienceBand)} of experience`
    : nanny.yearsExperience
      ? `${nanny.yearsExperience} years of experience`
      : ''
  const credential = [...nanny.verifiedBadges, ...nanny.selfBadges][0]
  const outOfBudget = !!budget && !rangesOverlap(budget, nanny.rateRange)

  const selectInPlace = onSelect
    ? (e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        onSelect(nanny.uid)
      }
    : undefined

  return (
    <motion.article {...hover}>
      <Link
        to={href}
        onClick={selectInPlace}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'block rounded-ll-card border-1.5 bg-ll-cream-dark p-4 shadow-soft transition-shadow hover:shadow-pop-peri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-sage',
          selected ? 'border-ll-sage ring-2 ring-ll-sage' : 'border-ll-peri-soft',
        )}
      >
        <div className="flex gap-4">
          {/* Square photo (left) */}
          {nanny.photoURL ? (
            <img
              src={nanny.photoURL}
              alt={`${nanny.fullName}, sitter`}
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-ll-input object-cover"
            />
          ) : (
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-ll-input bg-ll-sage-light">
              <span aria-hidden className="font-display text-3xl text-ll-sage-deep">
                {initials(nanny.fullName)}
              </span>
            </div>
          )}

          {/* Name + facts (middle) and rate (right) */}
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-2xl leading-none text-ll-ink">{nanny.fullName}</p>
              <p className="mt-1 text-sm text-ll-warm-gray">Santa Barbara</p>
              {experienceText && (
                <p className="mt-0.5 text-sm text-ll-warm-gray">{experienceText}</p>
              )}
              {credential && (
                <div className="mt-2">
                  <Badge label={badgeLabel(credential)} type={badgeType(credential)} size="sm" />
                </div>
              )}
            </div>

            {/* Rate (top-right), Care.com style: "from $30 / per hour" */}
            {nanny.rateRange && (
              <div className="shrink-0 text-right">
                <p className="text-xs text-ll-warm-gray">from</p>
                <p className="font-display text-2xl leading-none text-ll-ink">
                  {formatRate(nanny.rateRange).replace(/^from\s/, '').replace(/\/hr$/, '')}
                </p>
                <p className="text-xs text-ll-warm-gray">per hour</p>
              </div>
            )}
          </div>
        </div>

        {/* Bio snippet across the bottom */}
        {nanny.bio && (
          <p className="mt-3 line-clamp-2 border-t-1.5 border-ll-sand pt-3 text-sm text-ll-warm-gray">
            {nanny.bio}
          </p>
        )}
        {outOfBudget && (
          <p className="mt-2 text-xs text-ll-warm-gray">Outside your budget — you can still ask</p>
        )}
      </Link>
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

import { motion } from 'framer-motion'
import { Card, CardLabel } from './ui'
import { useSpringIn } from '../lib/motion'
import { cn } from '../lib/cn'

/** Compact metric/summary card used across dashboards. Springs in on mount. */
export function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  accent?: boolean
}) {
  const springIn = useSpringIn()
  return (
    <motion.div {...springIn}>
      <Card tone={accent ? 'sage' : 'default'} className={cn(accent && 'bg-ll-sage-light')}>
        <CardLabel>{label}</CardLabel>
        <p className="font-mono text-3xl font-medium leading-tight text-ll-ink">{value}</p>
        {/* On the sage-light accent ground, warm-gray fails AA (3.6:1); sage-deep clears it. */}
        {hint && (
          <p className={cn('mt-1 text-sm', accent ? 'text-ll-sage-deep' : 'text-ll-warm-gray')}>{hint}</p>
        )}
      </Card>
    </motion.div>
  )
}

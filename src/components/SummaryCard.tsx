import { Card, CardLabel } from './ui'

/** Compact metric/summary card used across dashboards. */
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
  return (
    <Card className={accent ? 'bg-sage-50 ring-sage-200' : undefined}>
      <CardLabel>{label}</CardLabel>
      <p className="font-display text-3xl leading-tight text-charcoal">{value}</p>
      {hint && <p className="mt-1 text-sm text-charcoal-muted">{hint}</p>}
    </Card>
  )
}

// A single hourly-rate field, shared by both setup wizards and both profile pages so the parsing,
// validation and disclaimer are identical everywhere.
//
// Single value, not a range (partner meeting 2026-09): a nanny enters the LOWEST rate they'll
// accept, a family the MOST they'll pay. The parent owns the raw string (so wizard steps can
// persist a half-typed value) and maps it to the internal RateRange on save via nannyFloorRange /
// familyCeilingRange — see rates.ts.
//
// State is the raw STRING the user typed, not cents: parsing every keystroke would fight the user
// (typing "2" in an empty field would commit $2/hr).

import { useId } from 'react'
import { Input } from './Input'
import { RateDisclaimer } from './RateDisclaimer'
import { validateRateValue } from '../../lib/rates'

interface Props {
  /** Raw dollar string, owned by the parent so wizard steps can persist it. */
  value: string
  onChange: (v: string) => void
  /** Whose rate this is — changes the label and helper copy. */
  role: 'family' | 'nanny'
}

export function RateRangeInput({ value, onChange, role }: Props) {
  const groupId = useId()
  const error = validateRateValue(value)
  // Only nag once they've actually started typing — an untouched field isn't "wrong".
  const touched = value.trim() !== ''

  const heading = role === 'nanny' ? 'Your hourly rate' : 'Your hourly budget'
  const label = role === 'nanny' ? 'Lowest rate you’ll accept' : 'Most you’ll pay per hour'
  const help =
    role === 'nanny'
      ? 'The least you’re willing to work for. Families see this on your profile, and we match you with families whose budget meets it.'
      : 'The most you’re comfortable paying per hour. We use it to show you nannies whose rates fit — you can still request anyone.'

  return (
    <div className="space-y-3" role="group" aria-labelledby={groupId}>
      <div>
        <p id={groupId} className="text-label font-medium text-ll-ink">
          {heading}
        </p>
        <p className="mt-1 text-sm text-ll-warm-gray">{help}</p>
      </div>

      <Input
        label={label}
        inputMode="decimal"
        placeholder={role === 'nanny' ? '25' : '35'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${groupId}-err`}
      />

      <p id={`${groupId}-err`} className="text-sm text-red-600" role={touched && error ? 'alert' : undefined}>
        {touched && error ? error : ''}
      </p>

      <RateDisclaimer />
    </div>
  )
}

// Paired min/max hourly-rate fields, shared by both setup wizards and both profile
// pages so the parsing, validation and disclaimer are identical everywhere.
//
// State is held as the raw STRINGS the user typed, not as cents: parsing on every
// keystroke would fight the user mid-entry (typing "2" in an empty field would commit
// $2/hr). The parent asks for cents via `value`/`onChange` and gets null while the
// input is incomplete or invalid.

import { useId } from 'react'
import { Input } from './Input'
import { RateDisclaimer } from './RateDisclaimer'
import { validateRatePair } from '../../lib/rates'

interface Props {
  /** Raw dollar strings, owned by the parent so wizard steps can persist them. */
  min: string
  max: string
  onMinChange: (v: string) => void
  onMaxChange: (v: string) => void
  /** Whose rate this is — changes the labels and helper copy. */
  role: 'family' | 'nanny'
}

export function RateRangeInput({ min, max, onMinChange, onMaxChange, role }: Props) {
  const groupId = useId()
  const error = validateRatePair(min, max)
  // Only nag once they've actually started typing — an untouched pair isn't "wrong".
  const touched = min.trim() !== '' || max.trim() !== ''

  const heading = role === 'nanny' ? 'Your hourly rate' : 'Your hourly budget'
  const help =
    role === 'nanny'
      ? 'The range you’re happy to work for. Families see this on your profile, and we match you with families whose budget fits.'
      : 'What you’re comfortable paying per hour. We use it to show you nannies whose rates fit — you can still request anyone.'

  return (
    <div className="space-y-3" role="group" aria-labelledby={groupId}>
      <div>
        <p id={groupId} className="text-label font-medium text-ll-ink">
          {heading}
        </p>
        <p className="mt-1 text-sm text-ll-warm-gray">{help}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Minimum"
          inputMode="decimal"
          placeholder="20"
          value={min}
          onChange={(e) => onMinChange(e.target.value)}
          aria-describedby={`${groupId}-err`}
        />
        <Input
          label="Maximum"
          inputMode="decimal"
          placeholder="30"
          value={max}
          onChange={(e) => onMaxChange(e.target.value)}
          aria-describedby={`${groupId}-err`}
        />
      </div>

      <p id={`${groupId}-err`} className="text-sm text-red-600" role={touched && error ? 'alert' : undefined}>
        {touched && error ? error : ''}
      </p>

      <RateDisclaimer />
    </div>
  )
}

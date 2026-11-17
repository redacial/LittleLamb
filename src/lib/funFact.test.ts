// composeFunFact builds the one-liner families read from the nanny's chosen prompt + answer.
// A nanny picks a prompt ("My superpower is…") and types a short answer ("turning broccoli
// into a treat"); the public line prepends the prompt's lead → "My superpower is turning
// broccoli into a treat." Handles the many back-compat / partial cases gracefully.
import { describe, it, expect } from 'vitest'
import { composeFunFact } from './funFact'

describe('composeFunFact', () => {
  it('prepends the prompt lead to the answer', () => {
    expect(composeFunFact('superpower', 'turning broccoli into a treat')).toBe(
      'My superpower is turning broccoli into a treat',
    )
  })

  it('returns the raw answer when there is no prompt (legacy funFact)', () => {
    // Pre-2026-11 nannies have a free-text funFact and no prompt id.
    expect(composeFunFact(undefined, 'Tide-pool expert and snack diplomat')).toBe(
      'Tide-pool expert and snack diplomat',
    )
  })

  it('returns the raw answer when the prompt id is unknown', () => {
    expect(composeFunFact('not-a-real-prompt', 'plays a mean kazoo')).toBe('plays a mean kazoo')
  })

  it('returns empty when there is no answer, even with a prompt chosen', () => {
    // A nanny who picked a prompt but never filled it shows nothing, not a dangling lead.
    expect(composeFunFact('superpower', '')).toBe('')
    expect(composeFunFact('superpower', undefined)).toBe('')
    expect(composeFunFact(undefined, undefined)).toBe('')
  })

  it('trims whitespace around the answer', () => {
    expect(composeFunFact('superpower', '  building blanket forts  ')).toBe(
      'My superpower is building blanket forts',
    )
  })
})

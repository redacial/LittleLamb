import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminSettingsPage } from './AdminSettingsPage'
import { DEFAULT_POLICIES } from '../../lib/policies'
import { SELF_BADGES, VERIFIED_BADGES } from '../../lib/badges'

// Both of these tabs were DEAD CHROME: inputs with a defaultValue and a Save button with no
// onClick. They looked editable, so Lucy would type, click Save, and lose the change with no
// error — worse than the tab not existing. The Calendly tab additionally held a SECOND
// hardcoded copy of the URL that NannyHoldingPage hardcoded separately, so the two could
// drift with nothing to catch it.

const saveCalendly = vi.fn(async () => {})
const savePolicies = vi.fn(async () => {})

// The real hooks hold their config in useState, so the object identity is STABLE across
// renders. The cards depend on that: they sync the config into a draft with
// `useEffect(..., [config])`, and a mock that returned a fresh literal each render would
// refire that effect on every keystroke and wipe what admin typed. Mirror the real shape.
const calendly = { current: { url: '' } }
const policies = { current: DEFAULT_POLICIES }

vi.mock('../../hooks/useAdmin', () => ({
  useCalendlyConfig: () => ({ config: calendly.current, loading: false, save: saveCalendly }),
  usePolicies: () => ({ policies: policies.current, loading: false, save: savePolicies }),
  useBillingConfig: () => ({
    config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
    loading: false,
    save: vi.fn(),
  }),
  useBadgeCatalog: () => ({
    badges: [...SELF_BADGES, ...VERIFIED_BADGES],
    self: SELF_BADGES,
    verified: VERIFIED_BADGES,
    loading: false,
    save: vi.fn(),
  }),
}))

beforeEach(() => {
  saveCalendly.mockClear()
  savePolicies.mockClear()
  calendly.current = { url: '' }
  policies.current = DEFAULT_POLICIES
})

const openTab = (name: RegExp) => userEvent.click(screen.getByRole('tab', { name }))

describe('AdminSettingsPage — Calendly tab', () => {
  it('shows the configured link rather than a hardcoded placeholder', async () => {
    calendly.current = { url: 'https://calendly.com/lucy-littlelamb/30min' }

    render(<AdminSettingsPage />)
    await openTab(/calendly/i)

    expect(screen.getByLabelText(/calendly link/i)).toHaveValue(
      'https://calendly.com/lucy-littlelamb/30min',
    )
  })

  it('starts EMPTY when nothing is configured — never a dead placeholder URL', async () => {
    // The old defaultValue pre-filled a 404ing URL, which reads as "already set up".
    render(<AdminSettingsPage />)
    await openTab(/calendly/i)

    expect(screen.getByLabelText(/calendly link/i)).toHaveValue('')
  })

  it('saves what admin types', async () => {
    render(<AdminSettingsPage />)
    await openTab(/calendly/i)

    await userEvent.type(
      screen.getByLabelText(/calendly link/i),
      'https://calendly.com/lucy-littlelamb/30min',
    )
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(saveCalendly).toHaveBeenCalledWith({ url: 'https://calendly.com/lucy-littlelamb/30min' })
  })

  it('trims the pasted link before saving', async () => {
    render(<AdminSettingsPage />)
    await openTab(/calendly/i)

    await userEvent.type(screen.getByLabelText(/calendly link/i), '  https://calendly.com/x  ')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(saveCalendly).toHaveBeenCalledWith({ url: 'https://calendly.com/x' })
  })
})

describe('AdminSettingsPage — Policies tab', () => {
  it('loads the current policy text into the editors', async () => {
    policies.current = { platform: 'Platform text', family: 'Family text', nanny: 'Nanny text' }

    render(<AdminSettingsPage />)
    await openTab(/policies/i)

    expect(screen.getByLabelText(/little lamb policies/i)).toHaveValue('Platform text')
    expect(screen.getByLabelText(/family policies/i)).toHaveValue('Family text')
    expect(screen.getByLabelText(/nanny policies/i)).toHaveValue('Nanny text')
  })

  it('saves all three blocks together', async () => {
    policies.current = { platform: 'Platform text', family: 'Family text', nanny: 'Nanny text' }

    render(<AdminSettingsPage />)
    await openTab(/policies/i)

    const familyBox = screen.getByLabelText(/family policies/i)
    await userEvent.clear(familyBox)
    await userEvent.type(familyBox, 'Cancel 24h ahead.')
    await userEvent.click(screen.getByRole('button', { name: /save policies/i }))

    expect(savePolicies).toHaveBeenCalledWith({
      platform: 'Platform text',
      family: 'Cancel 24h ahead.',
      nanny: 'Nanny text',
    })
  })
})

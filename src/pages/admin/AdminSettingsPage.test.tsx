import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminSettingsPage } from './AdminSettingsPage'
import { DEFAULT_POLICIES } from '../../lib/policies'
import { SELF_BADGES, VERIFIED_BADGES } from '../../lib/badges'

// The Policies tab was DEAD CHROME before this: inputs with a defaultValue and a Save button with
// no onClick. It looked editable, so Lucy would type, click Save, and lose the change with no
// error — worse than the tab not existing. (The Calendly tab was removed entirely in D77 — Little
// Lamb does not schedule interviews.)

const savePolicies = vi.fn(async () => {})

// The real hooks hold their config in useState, so the object identity is STABLE across
// renders. The cards depend on that: they sync the config into a draft with
// `useEffect(..., [config])`, and a mock that returned a fresh literal each render would
// refire that effect on every keystroke and wipe what admin typed. Mirror the real shape.
const policies = { current: DEFAULT_POLICIES }
// Same stability requirement, and it BITES here: BadgeCatalogCard syncs this into a draft with
// `useEffect(..., [badges])`. Returning `[...SELF_BADGES, ...VERIFIED_BADGES]` inline from the
// mock builds a new array identity every render, so the effect refires, setDraft re-renders,
// and the test hangs until the worker runs out of memory. Badges is now the FIRST tab, so it
// mounts in every render() in this file — hoist the array once.
const BADGE_CATALOG = [...SELF_BADGES, ...VERIFIED_BADGES]

vi.mock('../../hooks/useAdmin', () => ({
  usePolicies: () => ({ policies: policies.current, loading: false, save: savePolicies }),
  useBillingConfig: () => ({
    config: { subscriptionCents: 2500, perBookingCents: 100, enabled: false },
    loading: false,
    save: vi.fn(),
  }),
  useBadgeCatalog: () => ({
    badges: BADGE_CATALOG,
    self: SELF_BADGES,
    verified: VERIFIED_BADGES,
    loading: false,
    save: vi.fn(),
  }),
}))

beforeEach(() => {
  savePolicies.mockClear()
  policies.current = DEFAULT_POLICIES
})

const openTab = (name: RegExp) => userEvent.click(screen.getByRole('tab', { name }))


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

// ---------------------------------------------------------------------------------------
// The last two DEAD CHROME tabs. Both were `defaultValue` inputs over a Save button with no
// onClick — Lucy could type a new password or rewrite an approval email, click Save, and lose
// it with no error. Both were REMOVED rather than faked further:
//
//  - Account: a real password change needs Firebase Auth (reauthenticateWithCredential +
//    updatePassword), which belongs in src/lib/auth.ts under this project's rule that UI never
//    calls Firebase directly. Half-implementing it in the page — especially skipping
//    reauthentication, which Firebase REQUIRES for a password change after a stale login —
//    trades a silent no-op for a confusing auth/requires-recent-login error.
//
//  - Email templates: every subject and body is built by a hardcoded switch in
//    functions/src/email/templates.ts. Nothing the tab saved could change a single sent email
//    until the server reads a config doc, so the tab promised a capability that does not exist.
//    It is replaced by an honest read-only note.
//
// These assert ABSENCE, so they are the kind of test that passes for the wrong reason if the
// query is wrong. Each pairs the absence with a positive control proving the page rendered.

describe('AdminSettingsPage — removed dead chrome', () => {
  it('has no Account tab (password change was never wired to Firebase Auth)', () => {
    render(<AdminSettingsPage />)

    // Positive control: the tablist rendered, so a missing Account tab means removed, not unmounted.
    expect(screen.getByRole('tab', { name: /badges/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /account/i })).not.toBeInTheDocument()
  })

  it('offers no password field on the tab that opens by default', () => {
    // Account was the FIRST tab, so its password box was what Settings opened on. Asserting on
    // the default tab (rather than clicking through all of them, which is what actually
    // rendered the dead form) is the tightest check that it is gone.
    render(<AdminSettingsPage />)

    expect(screen.getByRole('tab', { name: /badges/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    expect(document.querySelector('input[type="password"]')).toBeNull()
  })

  it('has no editable email-template tab', () => {
    render(<AdminSettingsPage />)

    expect(screen.getByRole('tab', { name: /badges/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /email templates/i })).not.toBeInTheDocument()
  })

  it('says plainly that email copy is developer-managed, with nothing to click', async () => {
    render(<AdminSettingsPage />)
    await openTab(/emails/i)

    expect(screen.getByText(/developer-managed/i)).toBeInTheDocument()
    // The whole point: no control that looks like it saves.
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

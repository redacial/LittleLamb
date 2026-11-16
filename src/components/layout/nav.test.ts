// The free-launch gate on the sidebar. Little Lamb launches as a FREE service (billing is
// off: VITE_BILLING_LIVE is unset, so stripeEnabled is false). A family that is never charged
// must not see a "Billing" tab — it would promise a bill that never comes and invite a parent
// to hunt for charges that don't exist. When billing is later switched on, the tab returns.
//
// Admin's "Billing & Accounting" is an operational/accounting view (not a charge to the admin),
// so it is intentionally NOT gated here — only the family-facing Billing tab is.
import { describe, it, expect } from 'vitest'
import { navFor } from './nav'

describe('navFor — family Billing tab is gated on billing being live', () => {
  it('hides the family Billing tab when billing is OFF (the free-launch posture)', () => {
    const labels = navFor('family', { billingEnabled: false }).map((n) => n.label)
    expect(labels).not.toContain('Billing')
    // the rest of the family nav is untouched
    expect(labels).toContain('Dashboard')
    expect(labels).toContain('Our Nannies')
    expect(labels).toContain('Policies')
  })

  it('shows the family Billing tab when billing is ON', () => {
    const labels = navFor('family', { billingEnabled: true }).map((n) => n.label)
    expect(labels).toContain('Billing')
  })

  it('keeps the admin Billing & Accounting tab regardless of the billing flag', () => {
    expect(navFor('admin', { billingEnabled: false }).map((n) => n.label)).toContain(
      'Billing & Accounting',
    )
    expect(navFor('admin', { billingEnabled: true }).map((n) => n.label)).toContain(
      'Billing & Accounting',
    )
  })

  it('never shows Billing to nannies either way (they are never charged)', () => {
    expect(navFor('nanny', { billingEnabled: false }).map((n) => n.label)).not.toContain('Billing')
    expect(navFor('nanny', { billingEnabled: true }).map((n) => n.label)).not.toContain('Billing')
  })
})

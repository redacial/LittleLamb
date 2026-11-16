// Sidebar navigation definitions per role (CLAUDE.md Part 4). Single source so the layout and
// any nav-driven logic agree. Icons are simple inline glyph keys resolved in the Sidebar.
import type { Role } from '../../types'

export interface NavItem {
  to: string
  label: string
  icon: IconKey
  end?: boolean
}

export type IconKey =
  | 'home'
  | 'calendar'
  | 'bookings'
  | 'board'
  | 'nannies'
  | 'profile'
  | 'billing'
  | 'policies'
  | 'settings'
  | 'analytics'
  | 'families'

export const FAMILY_NAV: NavItem[] = [
  { to: '/family', label: 'Dashboard', icon: 'home', end: true },
  { to: '/family/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/family/bookings', label: 'Bookings', icon: 'bookings' },
  { to: '/family/nannies', label: 'Our Nannies', icon: 'nannies' },
  { to: '/family/profile', label: 'My Profile', icon: 'profile' },
  { to: '/family/billing', label: 'Billing', icon: 'billing' },
  { to: '/family/policies', label: 'Policies', icon: 'policies' },
]

export const NANNY_NAV: NavItem[] = [
  { to: '/nanny', label: 'Dashboard', icon: 'home', end: true },
  { to: '/nanny/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/nanny/bookings', label: 'Bookings', icon: 'bookings' },
  // Last-minute (<25h) and out-of-hours family requests land here for any nanny to claim.
  { to: '/nanny/job-board', label: 'Job Board', icon: 'board' },
  { to: '/nanny/nannies', label: 'Our Nannies', icon: 'nannies' },
  { to: '/nanny/profile', label: 'My Profile', icon: 'profile' },
  { to: '/nanny/policies', label: 'Policies', icon: 'policies' },
  // No Billing — nannies are never charged (spec).
]

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/admin/nannies', label: 'Nannies', icon: 'nannies' },
  { to: '/admin/families', label: 'Families', icon: 'families' },
  { to: '/admin/bookings', label: 'Bookings', icon: 'bookings' },
  { to: '/admin/waitlist', label: 'Waitlist', icon: 'board' },
  { to: '/admin/billing', label: 'Billing & Accounting', icon: 'billing' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
  // No My Profile — admin has no public-facing profile (spec).
]

import { stripeEnabled } from '../../hooks/useBilling'

export interface NavOptions {
  /**
   * Whether billing is live in the UI. Little Lamb launches FREE (billing off), and a family
   * that is never charged must not see a "Billing" tab. Defaults to the real launch gate
   * (stripeEnabled = publishable key present AND VITE_BILLING_LIVE === 'true'); tests inject it.
   * Only the family-facing Billing tab is gated — admin's "Billing & Accounting" is an
   * operational/accounting view and always shown.
   */
  billingEnabled?: boolean
}

export function navFor(role: Role, opts: NavOptions = {}): NavItem[] {
  const billingEnabled = opts.billingEnabled ?? stripeEnabled
  if (role === 'admin') return ADMIN_NAV
  if (role === 'nanny') return NANNY_NAV
  if (billingEnabled) return FAMILY_NAV
  return FAMILY_NAV.filter((item) => item.to !== '/family/billing')
}

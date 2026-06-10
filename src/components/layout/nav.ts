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
  | 'nannies'
  | 'profile'
  | 'billing'
  | 'messages'
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
  { to: '/family/messages', label: 'Messages', icon: 'messages' },
  { to: '/family/policies', label: 'Policies', icon: 'policies' },
]

export const NANNY_NAV: NavItem[] = [
  { to: '/nanny', label: 'Dashboard', icon: 'home', end: true },
  { to: '/nanny/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/nanny/bookings', label: 'Bookings', icon: 'bookings' },
  { to: '/nanny/nannies', label: 'Our Nannies', icon: 'nannies' },
  { to: '/nanny/profile', label: 'My Profile', icon: 'profile' },
  { to: '/nanny/messages', label: 'Messages', icon: 'messages' },
  { to: '/nanny/policies', label: 'Policies', icon: 'policies' },
  // No Billing — nannies are never charged (spec).
]

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/admin/nannies', label: 'Nannies', icon: 'nannies' },
  { to: '/admin/families', label: 'Families', icon: 'families' },
  { to: '/admin/bookings', label: 'Bookings', icon: 'bookings' },
  { to: '/admin/billing', label: 'Billing & Accounting', icon: 'billing' },
  { to: '/admin/messages', label: 'Messages', icon: 'messages' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
  // No My Profile — admin has no public-facing profile (spec).
]

export function navFor(role: Role): NavItem[] {
  if (role === 'admin') return ADMIN_NAV
  if (role === 'nanny') return NANNY_NAV
  return FAMILY_NAV
}

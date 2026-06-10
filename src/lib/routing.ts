// Central routing policy. One function decides the "home" route for any account state so the
// guard, the post-login redirect, and the holding page all agree. Mirrors the flow docs:
// pending -> holding; approved but wizard incomplete -> wizard; approved + done -> dashboard.
import type { UserDoc } from '../types'

export function homeRouteFor(profile: UserDoc | null): string {
  if (!profile) return '/login'

  if (profile.role === 'admin') return '/admin'

  // Not yet approved by an admin -> role-specific holding page.
  if (!profile.approved) {
    return profile.role === 'nanny' ? '/nanny/pending' : '/family/pending'
  }

  // Approved but onboarding wizard not finished -> wizard (blocks dashboard).
  if (!profile.wizardComplete) {
    return profile.role === 'nanny' ? '/nanny/setup' : '/family/setup'
  }

  return profile.role === 'nanny' ? '/nanny' : '/family'
}

// Pure routing decision for the mandatory-MFA gate, factored out of the React guard so it can
// be unit-tested without a router or a live Identity Platform backend. Little Lamb requires
// TOTP MFA for EVERY signed-in user. Firebase refuses second-factor enrollment until the
// user's email is verified, so the gate has THREE outcomes, in order:
//
//   1. email not verified  -> must verify first   (route: /mfa/verify-email)
//   2. verified, no factor  -> must enrol          (route: /mfa/enroll)
//   3. verified + enrolled  -> allowed through     (null = no redirect)
//
// Google-provider sign-ins arrive with email already verified, so they skip straight to step 2.
import { needsMfaEnrollment } from './mfa'
import type { User } from 'firebase/auth'

export const MFA_VERIFY_EMAIL_ROUTE = '/mfa/verify-email'
export const MFA_ENROLL_ROUTE = '/mfa/enroll'

/**
 * Returns the route the user must be sent to before they may use the app, or null when they
 * satisfy the MFA policy and should be let through. A null user returns null (the auth guard
 * owns the signed-out case; this gate never runs without a user).
 */
export function mfaGateRedirect(user: User | null): string | null {
  if (!user) return null
  if (!user.emailVerified) return MFA_VERIFY_EMAIL_ROUTE
  if (needsMfaEnrollment(user)) return MFA_ENROLL_ROUTE
  return null
}

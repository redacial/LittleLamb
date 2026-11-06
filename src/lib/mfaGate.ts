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
 * Whether mandatory MFA is enforced in this build. Defaults to ON — MFA is disabled ONLY when
 * VITE_REQUIRE_MFA is the literal string 'false'. This "secure by default" direction is
 * deliberate: a cloud build that simply forgot to set the flag still enforces MFA, so the only
 * way to turn it off is to opt out explicitly. We set it 'false' in `.env` (local dev / the
 * `npm run demo` emulator) so Lucy's walkthrough runs without the authenticator step; every
 * real (staging/prod) build leaves it unset and therefore enforced.
 *
 * TOTP enrollment also can't work locally anyway — it needs the Identity Platform backend,
 * which the emulator doesn't provide — so this flag is what keeps the local app usable at all.
 */
export function mfaRequired(): boolean {
  return import.meta.env.VITE_REQUIRE_MFA !== 'false'
}

/**
 * Returns the route the user must be sent to before they may use the app, or null when they
 * satisfy the MFA policy and should be let through. A null user returns null (the auth guard
 * owns the signed-out case; this gate never runs without a user). When MFA is not required in
 * this build (demo/local), always returns null — no gate.
 */
export function mfaGateRedirect(user: User | null): string | null {
  if (!user) return null
  if (!mfaRequired()) return null
  if (!user.emailVerified) return MFA_VERIFY_EMAIL_ROUTE
  if (needsMfaEnrollment(user)) return MFA_ENROLL_ROUTE
  return null
}

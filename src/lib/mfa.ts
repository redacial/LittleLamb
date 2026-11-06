// Multi-factor-auth service. Little Lamb requires TOTP (authenticator-app) MFA for EVERY user
// — a deliberate max-security posture for a platform holding children's names and family home
// addresses. All Firebase MFA calls live here; UI never touches firebase/auth directly
// (CLAUDE.md architecture).
//
// Flow overview:
//   ENROLLMENT (once, after email verification): startTotpEnrollment() -> show the QR /
//     secret -> user enters the 6-digit code from their app -> completeTotpEnrollment().
//   LOGIN CHALLENGE: an already-enrolled user signing in gets
//     `auth/multi-factor-auth-required` from signInWithEmailAndPassword; the UI catches it,
//     collects a code, and calls resolveTotpSignIn(error, code).
//
// Email-verification dependency: Firebase refuses second-factor enrollment until the user's
// email is verified, so the enrollment guard must sit AFTER email verification.
import {
  TotpMultiFactorGenerator,
  TotpSecret,
  getMultiFactorResolver,
  multiFactor,
  sendEmailVerification,
  reload,
  type User,
  type Auth,
  type MultiFactorError,
  type MultiFactorResolver,
} from 'firebase/auth'
import { auth } from './firebase'

/** Issuer label shown in the user's authenticator app next to the account. */
const TOTP_ISSUER = 'Little Lamb Nannies'

/**
 * Policy gate the route guard routes on: does this signed-in user still need to enrol a
 * second factor? True when there is a user with no enrolled factors. Returns false for a null
 * user (nothing to enrol — the auth guard already handles the signed-out case) and tolerates a
 * user object with no `multiFactor` field without crashing (defensive: never undefined-throw
 * inside a guard, which would white-screen the whole app).
 */
export function needsMfaEnrollment(user: User | null): boolean {
  if (!user) return false
  // The modular SDK exposes enrolled factors via multiFactor(user), not a property on User.
  // Guard defensively: never let a shape surprise throw inside a route guard (white-screen).
  try {
    const enrolled = multiFactor(user).enrolledFactors ?? []
    return enrolled.length === 0
  } catch {
    // If we genuinely can't read factor state, fail CLOSED — treat as "needs enrollment"
    // rather than letting a factor-less account through to protected surfaces.
    return true
  }
}

/** Sends (or resends) the email-verification link to the signed-in user's address. */
export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user)
}

/**
 * Refreshes the local user from the server and reports whether the email is now verified.
 * Used by the verify-email page to poll after the user clicks the link in their inbox,
 * without forcing a full re-login.
 */
export async function refreshEmailVerified(user: User): Promise<boolean> {
  await reload(user)
  return user.emailVerified
}

/** True when a sign-in error is the "you must complete MFA" challenge, narrowed safely. */
export function isTotpChallenge(err: unknown): err is MultiFactorError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'auth/multi-factor-auth-required'
  )
}

/**
 * Begins TOTP enrollment: returns the shared secret plus a provisioning URI that renders as
 * the QR code the authenticator app scans. The caller shows this, then passes the secret plus
 * the user's typed code to completeTotpEnrollment().
 */
export async function startTotpEnrollment(
  user: User,
  authInstance: Auth = auth,
): Promise<{ secret: TotpSecret; qrUri: string; sharedSecretKey: string }> {
  const session = await multiFactor(user).getSession()
  const secret = await TotpMultiFactorGenerator.generateSecret(session)
  const qrUri = secret.generateQrCodeUrl(user.email ?? 'account', TOTP_ISSUER)
  // The manual-entry key, for users who can't scan.
  const sharedSecretKey = secret.secretKey
  void authInstance // kept for symmetry / future multi-tenant; session is user-scoped
  return { secret, qrUri, sharedSecretKey }
}

/**
 * Finishes enrollment: verifies the first 6-digit code against the secret and, if valid,
 * permanently enrols the factor. Throws on a bad code (surfaced to the UI as "that code didn't
 * match"). `displayName` labels the factor in the account (e.g. "Authenticator app").
 */
export async function completeTotpEnrollment(
  user: User,
  secret: TotpSecret,
  code: string,
  displayName = 'Authenticator app',
): Promise<void> {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code)
  await multiFactor(user).enroll(assertion, displayName)
}

/**
 * Completes a login challenge. Given the `auth/multi-factor-auth-required` error and the code
 * the user typed, finds the enrolled TOTP factor and resolves sign-in. Rejects if the code is
 * wrong (Firebase throws) or if there is no TOTP factor to satisfy (misuse — e.g. the account
 * only has a phone factor, which this app never enrols).
 */
export async function resolveTotpSignIn(
  err: MultiFactorError | { code: string },
  code: string,
  authInstance: Auth = auth,
): Promise<void> {
  const resolver: MultiFactorResolver = getMultiFactorResolver(
    authInstance,
    err as MultiFactorError,
  )
  const totpHint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID)
  if (!totpHint) {
    throw new Error('No TOTP factor enrolled on this account to satisfy the challenge.')
  }
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code)
  await resolver.resolveSignIn(assertion)
}

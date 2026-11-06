import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The mandatory-MFA gate decides, for every signed-in user, whether they can enter the app or
// must first verify email / enrol a factor. A wrong answer here is a security control failing
// open (letting a factor-less account into surfaces holding children's addresses) or failing
// closed (trapping a correctly-enrolled user in a redirect loop). Both are worth pinning.

vi.mock('../lib/firebase', () => ({ auth: {} }))
// needsMfaEnrollment (via mfaGate) calls multiFactor(user) at runtime, so it must be mocked.
// We make it read enrolledFactors off the passed user object so each test can set them inline.
vi.mock('firebase/auth', () => ({
  multiFactor: (u: { _factors?: unknown[] }) => ({ enrolledFactors: u?._factors ?? [] }),
}))

import { mfaGateRedirect, mfaRequired, MFA_VERIFY_EMAIL_ROUTE, MFA_ENROLL_ROUTE } from './mfaGate'

function user(opts: { emailVerified: boolean; factors: unknown[] }) {
  return {
    emailVerified: opts.emailVerified,
    _factors: opts.factors,
  } as never
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('mfaRequired — secure-by-default flag (demo can opt OUT, real builds cannot forget)', () => {
  it('is ON when the flag is unset (the real staging/prod case)', () => {
    vi.stubEnv('VITE_REQUIRE_MFA', undefined as never)
    expect(mfaRequired()).toBe(true)
  })

  it('is ON for any value other than the literal "false" (no accidental disable)', () => {
    vi.stubEnv('VITE_REQUIRE_MFA', 'true')
    expect(mfaRequired()).toBe(true)
    vi.stubEnv('VITE_REQUIRE_MFA', 'no')
    expect(mfaRequired()).toBe(true)
  })

  it('is OFF only for the explicit literal "false" (the demo opt-out)', () => {
    vi.stubEnv('VITE_REQUIRE_MFA', 'false')
    expect(mfaRequired()).toBe(false)
  })
})

describe('mfaGateRedirect — when MFA is disabled (demo)', () => {
  it('never redirects, even for an unverified, factor-less user', () => {
    vi.stubEnv('VITE_REQUIRE_MFA', 'false')
    expect(mfaGateRedirect(user({ emailVerified: false, factors: [] }))).toBeNull()
  })
})

describe('mfaGateRedirect', () => {
  // These assert the ENFORCED-MFA behaviour. `.env` sets VITE_REQUIRE_MFA=false for local/demo,
  // and Vitest loads it, so each test here pins the flag ON to test the real staging/prod gate.
  beforeEach(() => {
    vi.stubEnv('VITE_REQUIRE_MFA', 'true')
  })

  it('sends an UNVERIFIED-email user to verify first (enrollment is impossible before then)', () => {
    expect(mfaGateRedirect(user({ emailVerified: false, factors: [] }))).toBe(MFA_VERIFY_EMAIL_ROUTE)
  })

  it('sends a verified user with NO enrolled factor to enrol', () => {
    expect(mfaGateRedirect(user({ emailVerified: true, factors: [] }))).toBe(MFA_ENROLL_ROUTE)
  })

  it('lets a verified + enrolled user THROUGH (no redirect)', () => {
    expect(mfaGateRedirect(user({ emailVerified: true, factors: [{ factorId: 'totp' }] }))).toBeNull()
  })

  it('verify-email takes precedence even if (somehow) a factor exists but email is unverified', () => {
    // Defensive ordering: never let an unverified account proceed, factor or not.
    expect(mfaGateRedirect(user({ emailVerified: false, factors: [{ factorId: 'totp' }] }))).toBe(
      MFA_VERIFY_EMAIL_ROUTE,
    )
  })

  it('returns null for a null user (the auth guard owns the signed-out case)', () => {
    expect(mfaGateRedirect(null)).toBeNull()
  })
})

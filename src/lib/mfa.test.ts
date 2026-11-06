import { describe, it, expect, vi, beforeEach } from 'vitest'

// MFA policy + resolver logic. Little Lamb requires TOTP (authenticator-app) MFA for EVERY
// user (families, nannies, admins) — a deliberate max-security posture for a platform that
// stores children's names and home addresses. The two things worth unit-testing without the
// live Identity Platform backend are:
//   1. the POLICY decision — given an auth user, must they still enrol? — because the guard
//      routes on it and a wrong answer either locks everyone out or lets everyone skip MFA.
//   2. the login RESOLVER plumbing — a correct TOTP code must complete sign-in; a wrong one
//      must not, and must surface as a clean error rather than a thrown internal.

const getMultiFactorResolver = vi.fn()
const multiFactor = vi.fn()

vi.mock('../lib/firebase', () => ({ auth: { name: 'test-auth' } }))

vi.mock('firebase/auth', () => ({
  // TotpMultiFactorGenerator.assertionForSignIn(uid, code) -> an opaque assertion object.
  TotpMultiFactorGenerator: {
    FACTOR_ID: 'totp',
    assertionForSignIn: (uid: string, code: string) => ({ _assert: true, uid, code }),
    assertionForEnrollment: (secret: unknown, code: string) => ({ _enroll: true, secret, code }),
    generateSecret: vi.fn(),
  },
  getMultiFactorResolver: (...a: unknown[]) => getMultiFactorResolver(...a),
  multiFactor: (...a: unknown[]) => multiFactor(...a),
}))

import {
  needsMfaEnrollment,
  isTotpChallenge,
  resolveTotpSignIn,
} from './mfa'

beforeEach(() => {
  getMultiFactorResolver.mockReset()
  multiFactor.mockReset()
})

describe('needsMfaEnrollment — the policy gate the guard routes on', () => {
  it('requires enrollment for a user with NO enrolled factors', () => {
    multiFactor.mockReturnValue({ enrolledFactors: [] })
    expect(needsMfaEnrollment({} as never)).toBe(true)
  })

  it('does NOT require enrollment once a TOTP factor is enrolled', () => {
    multiFactor.mockReturnValue({ enrolledFactors: [{ factorId: 'totp' }] })
    expect(needsMfaEnrollment({} as never)).toBe(false)
  })

  it('treats a null user as not-needing-enrollment (nothing to enrol; the auth guard handles null)', () => {
    expect(needsMfaEnrollment(null)).toBe(false)
  })

  it('fails CLOSED (needs enrollment) if factor state cannot be read — never lets a factor-less account through', () => {
    multiFactor.mockImplementation(() => {
      throw new Error('cannot read factors')
    })
    expect(needsMfaEnrollment({} as never)).toBe(true)
  })
})

describe('isTotpChallenge — recognising the login MFA-required error', () => {
  it('is true for auth/multi-factor-auth-required', () => {
    expect(isTotpChallenge({ code: 'auth/multi-factor-auth-required' })).toBe(true)
  })
  it('is false for an ordinary wrong-password error', () => {
    expect(isTotpChallenge({ code: 'auth/wrong-password' })).toBe(false)
  })
  it('is false for a non-error value', () => {
    expect(isTotpChallenge(null)).toBe(false)
    expect(isTotpChallenge('nope')).toBe(false)
  })
})

describe('resolveTotpSignIn — completing a login challenge with a TOTP code', () => {
  it('resolves the stored resolver with an assertion built from the code', async () => {
    const resolveSignIn = vi.fn(async () => ({ user: { uid: 'u1' } }))
    const fakeError = {
      code: 'auth/multi-factor-auth-required',
      // the first enrolled hint identifies which factor to satisfy
    }
    getMultiFactorResolver.mockReturnValue({
      hints: [{ uid: 'enrolledUid1', factorId: 'totp' }],
      resolveSignIn,
    })

    await resolveTotpSignIn(fakeError, '123456')

    // It must have asked for the resolver from the error, then resolved with an assertion
    // bound to the enrolled factor's uid and the user-entered code.
    expect(getMultiFactorResolver).toHaveBeenCalledOnce()
    expect(resolveSignIn).toHaveBeenCalledOnce()
    const calls = resolveSignIn.mock.calls as unknown as Array<Array<{ uid: string; code: string }>>
    const assertion = calls[0][0]
    expect(assertion.uid).toBe('enrolledUid1')
    expect(assertion.code).toBe('123456')
  })

  it('rejects when there is no TOTP hint to satisfy (misuse / wrong factor)', async () => {
    getMultiFactorResolver.mockReturnValue({
      hints: [{ uid: 'x', factorId: 'phone' }],
      resolveSignIn: vi.fn(),
    })
    await expect(resolveTotpSignIn({ code: 'auth/multi-factor-auth-required' }, '123456'))
      .rejects.toThrow()
  })
})

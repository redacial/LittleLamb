import { describe, it, expect } from 'vitest'
import { homeRouteFor } from './routing'
import type { UserDoc } from '../types'

function makeUser(partial: Partial<UserDoc>): UserDoc {
  return {
    uid: 'u1',
    role: 'family',
    email: 'a@b.co',
    fullName: 'Test User',
    phone: '',
    approved: false,
    status: 'pending',
    wizardComplete: false,
    referralCode: 'ABC1234',
    referredBy: null,
    referralSource: null,
    createdAt: null,
    updatedAt: null,
    ...partial,
  }
}

describe('homeRouteFor', () => {
  it('sends signed-out users to login', () => {
    expect(homeRouteFor(null)).toBe('/login')
  })

  it('always sends admins to the admin panel', () => {
    expect(homeRouteFor(makeUser({ role: 'admin', approved: false, wizardComplete: false }))).toBe(
      '/admin',
    )
  })

  it('routes pending family to family holding page', () => {
    expect(homeRouteFor(makeUser({ role: 'family', approved: false }))).toBe('/family/pending')
  })

  it('routes pending nanny to nanny holding page', () => {
    expect(homeRouteFor(makeUser({ role: 'nanny', approved: false }))).toBe('/nanny/pending')
  })

  it('routes approved-but-unfinished family to the wizard', () => {
    expect(homeRouteFor(makeUser({ role: 'family', approved: true, wizardComplete: false }))).toBe(
      '/family/setup',
    )
  })

  it('routes approved-but-unfinished nanny to the wizard', () => {
    expect(homeRouteFor(makeUser({ role: 'nanny', approved: true, wizardComplete: false }))).toBe(
      '/nanny/setup',
    )
  })

  it('routes fully approved + onboarded users to their dashboard', () => {
    expect(homeRouteFor(makeUser({ role: 'family', approved: true, wizardComplete: true }))).toBe(
      '/family',
    )
    expect(homeRouteFor(makeUser({ role: 'nanny', approved: true, wizardComplete: true }))).toBe(
      '/nanny',
    )
  })
})

// homeRouteFor branched only on `approved`, never on `status` — so a REJECTED applicant was
// routed to the same holding page as a pending one, which reads "We'll email you the moment
// you're approved." Forever. And because platform email isn't live yet, the rejection email
// that was supposed to tell them can't send either, so there was no other signal at all: a
// family Lucy declined would keep checking back, and eventually call her to ask why.
describe('homeRouteFor — a decision that has been made must not read as pending', () => {
  it('routes a rejected family to its own page, not the review page', () => {
    const route = homeRouteFor(makeUser({ role: 'family', approved: false, status: 'rejected' }))
    expect(route).not.toBe('/family/pending')
    expect(route).toBe('/family/declined')
  })

  it('routes a rejected nanny to its own page, not the review page', () => {
    const route = homeRouteFor(makeUser({ role: 'nanny', approved: false, status: 'rejected' }))
    expect(route).not.toBe('/nanny/pending')
    expect(route).toBe('/nanny/declined')
  })

  // Deactivated is a different state from declined — the account was live and was turned off.
  // It must not read as "still under review" either.
  it('routes an inactive account away from the review page', () => {
    const route = homeRouteFor(makeUser({ role: 'family', approved: false, status: 'inactive' }))
    expect(route).not.toBe('/family/pending')
  })

  it('still routes a genuinely pending applicant to the review page', () => {
    expect(homeRouteFor(makeUser({ role: 'family', approved: false, status: 'pending' }))).toBe(
      '/family/pending',
    )
  })

  // An admin re-instating someone must actually free them, so this is the recovery path.
  it('lets a reinstated applicant back into the normal flow', () => {
    expect(
      homeRouteFor(makeUser({ role: 'family', approved: true, status: 'approved' })),
    ).toBe('/family/setup')
  })
})

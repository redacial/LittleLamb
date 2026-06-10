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

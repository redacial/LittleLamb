import { describe, it, expect } from 'vitest'
import { canReadBooking, type Viewer } from './access'

const family: Viewer = { uid: 'fam1', role: 'family' }
const otherFamily: Viewer = { uid: 'fam2', role: 'family' }
const nanny: Viewer = { uid: 'nan1', role: 'nanny' }
const otherNanny: Viewer = { uid: 'nan2', role: 'nanny' }
const admin: Viewer = { uid: 'adm1', role: 'admin' }

const booking = { familyId: 'fam1', nannyId: 'nan1', status: 'confirmed' as const }
const openBooking = { familyId: 'fam1', nannyId: null, status: 'open' as const }

describe('canReadBooking (mirrors firestore.rules)', () => {
  it('lets the owning family read its booking', () => {
    expect(canReadBooking(family, booking)).toBe(true)
  })
  it('blocks a different family from reading it (cross-tenant)', () => {
    expect(canReadBooking(otherFamily, booking)).toBe(false)
  })
  it('lets the assigned nanny read it', () => {
    expect(canReadBooking(nanny, booking)).toBe(true)
  })
  it('blocks an unassigned nanny from a confirmed booking', () => {
    expect(canReadBooking(otherNanny, booking)).toBe(false)
  })
  it('lets any nanny read open/unmatched bookings', () => {
    expect(canReadBooking(otherNanny, openBooking)).toBe(true)
  })
  it('always lets admin read', () => {
    expect(canReadBooking(admin, booking)).toBe(true)
    expect(canReadBooking(admin, openBooking)).toBe(true)
  })
})

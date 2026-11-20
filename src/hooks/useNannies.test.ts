import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNannyDirectory, useNanny } from './useNannies'

// THE BUG THIS PINS:
//
// A nanny's own profile save (NannyProfilePage:148) writes selfBadges but NOT verifiedBadges —
// correct, because verifiedBadges is admin-only. So every wizard-created nannies/{uid} doc has
// NO verifiedBadges field. The NannyProfile TYPE declares both arrays as required string[], but
// Firestore returns exactly what's stored, so the field comes back `undefined`.
//
// The shared NannyProfilePage does `nanny.verifiedBadges.map(...)` and `.length`, and NannyCard
// does `[...nanny.verifiedBadges, ...nanny.selfBadges]`. On an undefined array that throws a
// TypeError at RENDER, which the app's ErrorBoundary catches — the "Something went wrong /
// hello@littlelambnannies.com" crash screen, on BOTH the family and nanny side (the page is
// shared). Seed data happens to set both arrays, so this only bites real/wizard-created profiles.
//
// The fix belongs at the data boundary: both read hooks normalize the arrays to [] so EVERY
// consumer is safe, not just the call sites we happen to patch. These tests pin that contract.

const getDocs = vi.fn()
const getDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDocs: (...a: unknown[]) => getDocs(...(a as [])),
  getDoc: (...a: unknown[]) => getDoc(...(a as [])),
}))

vi.mock('../lib/firebase', () => ({ db: {} }))

beforeEach(() => {
  getDocs.mockReset()
  getDoc.mockReset()
})

/** A nannies/{uid} doc as a WIZARD creates it: selfBadges present, verifiedBadges absent. */
const wizardDoc = {
  uid: 'n1',
  fullName: 'Maya Brooks',
  bio: 'Hi',
  selfBadges: ['pet_friendly'],
  // verifiedBadges deliberately absent — admin-only, never written by the nanny.
}

describe('useNannyDirectory — badge arrays are always present', () => {
  it('defaults a missing verifiedBadges to [] so the grid cannot crash', async () => {
    getDocs.mockResolvedValue({
      size: 1,
      docs: [{ data: () => wizardDoc }],
    })

    const { result } = renderHook(() => useNannyDirectory())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const n = result.current.nannies[0]
    expect(Array.isArray(n.verifiedBadges)).toBe(true)
    expect(n.verifiedBadges).toEqual([])
    expect(n.selfBadges).toEqual(['pet_friendly'])
  })
})

describe('useNanny — badge arrays are always present', () => {
  it('defaults a missing verifiedBadges to [] so the profile page cannot crash', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => wizardDoc,
    })

    const { result } = renderHook(() => useNanny('n1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const n = result.current.nanny!
    expect(Array.isArray(n.verifiedBadges)).toBe(true)
    expect(n.verifiedBadges).toEqual([])
    expect(n.selfBadges).toEqual(['pet_friendly'])
  })
})

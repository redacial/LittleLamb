import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NannyProfilePage } from './NannyProfilePage'
import type { DirectoryNanny } from '../../hooks/useNannies'
import type { UserDoc } from '../../types'

// DEAD CHROME, family-facing this time: "Request outside hours" rendered as a real secondary
// button with NO onClick. CLAUDE.md §11.2 Path B describes it as a genuine booking path (modal
// with date/time + a pre-written editable message), so families will actively click it —
// it is the documented way to reach a nanny outside her posted availability. Clicking did
// nothing at all: no modal, no navigation, no error. On the surface whose whole job is
// converting interest into a booking, a CTA that silently no-ops reads as "the site is broken"
// and costs the booking. Removed until the booking-hook wiring exists.
//
// Mock objects are hoisted to module scope so their identity is STABLE across renders — the
// mocked hook is called on every render, and a fresh literal each time re-fires any
// identity-keyed effect downstream.

const NANNY: DirectoryNanny = {
  uid: 'nanny-1',
  fullName: 'Maya Brooks',
  photoURL: null,
  bio: 'Six years with Santa Barbara families.',
  introVideoURL: null,
  yearsExperience: '6',
  selfBadges: ['pet_friendly'],
  verifiedBadges: ['cpr'],
  availability: [{ day: 1, start: '15:00', end: '20:00' }],
} as DirectoryNanny

const nannyState = { current: { nanny: NANNY as DirectoryNanny | null, loading: false } }
const authState = { current: { user: null, profile: null as UserDoc | null, loading: false } }

vi.mock('../../hooks/useNannies', () => ({
  useNanny: () => nannyState.current,
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState.current,
}))

const FAMILY = { role: 'family' } as UserDoc
const NANNY_USER = { role: 'nanny' } as UserDoc

function renderPage(profile: UserDoc | null) {
  authState.current = { user: null, profile, loading: false }
  return render(
    <MemoryRouter>
      <NannyProfilePage />
    </MemoryRouter>,
  )
}

describe('NannyProfilePage — booking CTAs', () => {
  it('shows no dead "Request outside hours" button to families', () => {
    renderPage(FAMILY)

    // Positive control: the family-only CTA block rendered, so a missing "request" button
    // means it was removed — not that the whole action area failed to render.
    expect(screen.getByRole('link', { name: /book this nanny/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /request outside hours/i })).not.toBeInTheDocument()
  })

  it('still offers families the working booking path', () => {
    renderPage(FAMILY)

    expect(screen.getByRole('link', { name: /book this nanny/i })).toHaveAttribute(
      'href',
      '/family/calendar?nanny=nanny-1',
    )
  })

  it('shows no booking CTAs at all to nannies viewing a peer', () => {
    renderPage(NANNY_USER)

    expect(screen.queryByRole('link', { name: /book this nanny/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /request outside hours/i })).not.toBeInTheDocument()
    // Positive control: the profile itself still rendered for the nanny.
    expect(screen.getAllByText(/maya brooks/i).length).toBeGreaterThan(0)
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NannyCard } from './NannyCard'
import type { DirectoryNanny } from '../hooks/useNannies'

// The card is the family's first, scannable impression of a nanny. These tests pin the
// behaviours that make it *trustworthy*, not just pretty: the person's warm one-liner shows
// over the photo, but the trust signal (background check) and the booking path are always
// present and point at the right role-scoped URL. A regression in any of these is a silent
// loss of a booking or of the core trust promise, so each is asserted independently.

const BASE: DirectoryNanny = {
  uid: 'nanny-7',
  fullName: 'Maya Brooks',
  photoURL: 'https://example.test/maya.jpg',
  funFact: 'Tide-pool expert and snack diplomat',
  bio: 'Six years with Santa Barbara families.',
  introVideoURL: null,
  yearsExperience: '6',
  personalStatement: '',
  selfBadges: ['pet_friendly'],
  verifiedBadges: ['cpr'],
  availability: [{ day: 1, start: '15:00', end: '20:00' }],
  rateRange: { minCents: 2400, maxCents: 50000 },
}

function renderCard(props: Partial<Parameters<typeof NannyCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <NannyCard nanny={BASE} profileBase="/family" canBook {...props} />
    </MemoryRouter>,
  )
}

describe('NannyCard', () => {
  it('shows the name and the fun fact as the photo caption', () => {
    renderCard()
    expect(screen.getByText('Maya Brooks')).toBeInTheDocument()
    expect(screen.getByText(/tide-pool expert/i)).toBeInTheDocument()
  })

  it('renders without a fun fact — it is optional, never required', () => {
    renderCard({ nanny: { ...BASE, funFact: undefined } })
    expect(screen.getByText('Maya Brooks')).toBeInTheDocument()
    expect(screen.queryByText(/tide-pool expert/i)).not.toBeInTheDocument()
  })

  it('always carries the background-check trust signal', () => {
    renderCard()
    expect(screen.getByText(/background checked/i)).toBeInTheDocument()
    expect(screen.getByText(/6 yrs experience/i)).toBeInTheDocument()
  })

  it('links the photo and the View-profile button to the role-scoped profile', () => {
    renderCard({ profileBase: '/nanny' })
    const links = screen.getAllByRole('link')
    const profileLinks = links.filter((a) => a.getAttribute('href') === '/nanny/nannies/nanny-7')
    // Both the photo wrapper and the View-profile button point at the profile.
    expect(profileLinks.length).toBeGreaterThanOrEqual(2)
  })

  it('offers Book only to families', () => {
    const { rerender } = renderCard({ canBook: true })
    expect(screen.getByRole('link', { name: /^book$/i })).toHaveAttribute(
      'href',
      '/family/calendar?nanny=nanny-7',
    )

    rerender(
      <MemoryRouter>
        <NannyCard nanny={BASE} profileBase="/nanny" canBook={false} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link', { name: /^book$/i })).not.toBeInTheDocument()
  })

  it('flags a nanny outside the family budget without hiding her', () => {
    // Family can pay at most $20; nanny floor is $24 → no overlap.
    renderCard({ budget: { minCents: 0, maxCents: 2000 } })
    expect(screen.getByText(/outside your budget/i)).toBeInTheDocument()
    // Still fully present and bookable — a soft label, not a filter.
    expect(screen.getByRole('link', { name: /^book$/i })).toBeInTheDocument()
  })

  it('falls back to initials when a nanny has no photo yet', () => {
    renderCard({ nanny: { ...BASE, photoURL: null } })
    // No <img>, but the identity is still legible.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const article = screen.getByRole('article')
    expect(within(article).getByText('MB')).toBeInTheDocument()
  })
})

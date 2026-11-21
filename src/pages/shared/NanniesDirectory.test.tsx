import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NanniesDirectory } from './NanniesDirectory'
import type { DirectoryNanny } from '../../hooks/useNannies'
import type { UserDoc } from '../../types'

// Master-detail directory: a horizontal strip of cards on the left; clicking one opens the FULL
// profile in a right-side pane ON THE SAME PAGE (desktop), backed by ?selected=<uid> for
// deep-linking and Back. The selected nanny is resolved from the already-loaded directory list —
// NO second fetch. On narrow screens the card navigates to the full-screen route instead (that
// path is NannyProfilePage's job; here we force the desktop/pane branch via matchMedia).

const MAYA: DirectoryNanny = {
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

const SOFIA: DirectoryNanny = {
  ...MAYA,
  uid: 'nanny-2',
  fullName: 'Sofia Reyes',
  bio: 'Loves arts and crafts.',
} as DirectoryNanny

const dir = {
  current: {
    nannies: [MAYA, SOFIA] as DirectoryNanny[],
    loading: false,
    error: null as Error | null,
    truncated: false,
  },
}

vi.mock('../../hooks/useNannies', () => ({
  useNannyDirectory: () => dir.current,
}))

vi.mock('../../hooks/useProfile', () => ({
  useFamilyProfile: () => ({ profile: null, loading: false }),
}))

const authState = { current: { user: { uid: 'f1' }, profile: { role: 'family' } as UserDoc | null } }
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState.current,
}))

// Force the desktop (pane) branch: lg media query matches.
beforeEach(() => {
  dir.current = { nannies: [MAYA, SOFIA], loading: false, error: null, truncated: false }
  authState.current = { user: { uid: 'f1' }, profile: { role: 'family' } as UserDoc }
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: true, // lg+
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }))
})

function show(initialEntries = ['/family/nannies']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <NanniesDirectory />
    </MemoryRouter>,
  )
}

describe('NanniesDirectory — master-detail selection', () => {
  it('shows an empty pane (no profile) when nothing is selected', () => {
    show()
    // Both cards are listed...
    expect(screen.getByText('Maya Brooks')).toBeInTheDocument()
    expect(screen.getByText('Sofia Reyes')).toBeInTheDocument()
    // ...but no profile pane heading / Book CTA is shown yet.
    expect(screen.queryByRole('link', { name: /book this nanny/i })).not.toBeInTheDocument()
  })

  it('opens the selected nanny in the pane and puts ?selected in the URL', async () => {
    const user = userEvent.setup()
    show()
    // Each list row is a single link; click Maya's row to open her in the pane.
    const cards = screen.getAllByRole('article')
    const mayaCard = cards.find((c) => within(c).queryByText('Maya Brooks'))!
    // Each wide result card is a single link; click Maya's to open her in the pane.
    await user.click(within(mayaCard).getByRole('link'))

    // The pane now shows Maya's bookable profile (the Book CTA is pane-owned).
    expect(await screen.findByRole('link', { name: /book this nanny/i })).toHaveAttribute(
      'href',
      '/family/calendar?nanny=nanny-1',
    )
  })

  it('renders the pane straight from ?selected= on load (deep link, no second fetch)', () => {
    show(['/family/nannies?selected=nanny-2'])
    // Sofia's profile is shown, resolved from the in-memory list — there is no useNanny mock here,
    // so if a second fetch were attempted this would not render her bookable profile.
    expect(screen.getByRole('link', { name: /book this nanny/i })).toHaveAttribute(
      'href',
      '/family/calendar?nanny=nanny-2',
    )
  })

  it('shows nothing-selected empty space for an unknown ?selected= id', () => {
    show(['/family/nannies?selected=ghost'])
    expect(screen.queryByRole('link', { name: /book this nanny/i })).not.toBeInTheDocument()
  })
})

// Listing-service model (D77): Little Lamb does not approve or interview sitters, so this page no
// longer shows a review/interview tracker. A new sitter is active immediately and sees a warm
// welcome into profile setup. These tests assert that there is NO review/interview copy and that
// the way forward (continue to the profile wizard) is always present.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NannyHoldingPage } from './NannyHoldingPage'

const profile = {
  current: {
    fullName: 'Priya Raman',
    role: 'nanny',
    status: 'approved',
    approved: true,
  },
}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: profile.current }) }))
vi.mock('../../lib/auth', () => ({ signOut: vi.fn() }))

const show = () => render(<MemoryRouter><NannyHoldingPage /></MemoryRouter>)

beforeEach(() => {
  profile.current = {
    fullName: 'Priya Raman',
    role: 'nanny',
    status: 'approved',
    approved: true,
  }
})

describe('NannyHoldingPage — listing-service welcome (no approval gate)', () => {
  it('welcomes the sitter by name', () => {
    show()
    expect(screen.getByRole('heading', { name: /you.re in, priya/i })).toBeInTheDocument()
  })

  it('shows NO review or interview tracker', () => {
    show()
    expect(screen.queryByText(/where you are in our review/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/interview/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/under review/i)).not.toBeInTheDocument()
  })

  it('gives her the way forward into profile setup', () => {
    show()
    expect(screen.getByRole('link', { name: /continue/i })).toBeInTheDocument()
  })
})

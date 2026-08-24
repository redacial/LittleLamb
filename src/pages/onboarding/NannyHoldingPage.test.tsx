// Same bug as the family page: AuthContext's live snapshot flips `approved` the instant an
// admin approves, but this page ignored it and kept showing the 4-step review tracker. With
// platform email dark, an approved nanny had no way at all to learn the answer had arrived.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NannyHoldingPage } from './NannyHoldingPage'

const profile = {
  current: {
    fullName: 'Priya Raman',
    role: 'nanny',
    status: 'pending',
    approved: false,
    stage: 'under_review',
  },
}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: profile.current }) }))
vi.mock('../../lib/auth', () => ({ signOut: vi.fn() }))
vi.mock('../../hooks/useAdmin', () => ({
  useCalendlyConfig: () => ({ config: { url: '' }, loading: false }),
}))

const show = () => render(<MemoryRouter><NannyHoldingPage /></MemoryRouter>)

beforeEach(() => {
  profile.current = {
    fullName: 'Priya Raman',
    role: 'nanny',
    status: 'pending',
    approved: false,
    stage: 'under_review',
  }
})

describe('NannyHoldingPage — while pending', () => {
  it('shows where she is in the review', () => {
    show()
    expect(screen.getByText(/where you are in our review/i)).toBeInTheDocument()
  })
})

describe('NannyHoldingPage — the moment approval lands', () => {
  beforeEach(() => {
    profile.current = { ...profile.current, status: 'approved', approved: true }
  })

  it('stops showing the review tracker', () => {
    show()
    expect(screen.queryByText(/where you are in our review/i)).not.toBeInTheDocument()
  })

  it('tells her she is approved, without a re-login', () => {
    show()
    expect(screen.getByRole('heading', { name: /you.re approved/i })).toBeInTheDocument()
  })

  it('gives her the way forward', () => {
    show()
    expect(screen.getByRole('link', { name: /continue/i })).toBeInTheDocument()
  })
})

// AuthContext keeps a live onSnapshot on the user doc, so `approved` flips the instant Lucy
// clicks Approve. But this page never read it — so the family sat on "we're reviewing your
// application" and the page never changed. They had to independently guess to log out and back
// in, and with platform email dark, NOTHING told them to.
//
// This is the change that makes a demo before email actually work: the data was already
// arriving, nothing consumed it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FamilyHoldingPage } from './FamilyHoldingPage'

const profile = {
  current: { fullName: 'Dana Ortega', role: 'family', status: 'pending', approved: false },
}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: profile.current }) }))
vi.mock('../../lib/auth', () => ({ signOut: vi.fn() }))

const show = () => render(<MemoryRouter><FamilyHoldingPage /></MemoryRouter>)

beforeEach(() => {
  profile.current = { fullName: 'Dana Ortega', role: 'family', status: 'pending', approved: false }
})

describe('FamilyHoldingPage — while genuinely pending', () => {
  it('says the application is under review', () => {
    show()
    expect(screen.getByText(/reviewing your application/i)).toBeInTheDocument()
  })

  it('does not claim they are approved', () => {
    show()
    expect(screen.queryByRole('link', { name: /go to your dashboard|you.re approved/i })).not.toBeInTheDocument()
  })
})

describe('FamilyHoldingPage — the moment approval lands', () => {
  beforeEach(() => {
    profile.current = { fullName: 'Dana Ortega', role: 'family', status: 'approved', approved: true }
  })

  it('stops saying the application is under review', () => {
    show()
    expect(screen.queryByText(/reviewing your application/i)).not.toBeInTheDocument()
  })

  it('tells them they are approved, without needing a re-login', () => {
    show()
    expect(screen.getByRole('heading', { name: /you.re approved/i })).toBeInTheDocument()
  })

  it('gives them the way forward', () => {
    show()
    expect(screen.getByRole('link', { name: /continue|complete your profile|get started/i })).toBeInTheDocument()
  })

  it('never promises an email it cannot send', () => {
    show()
    expect(screen.queryByText(/we.ll email you the moment/i)).not.toBeInTheDocument()
  })
})

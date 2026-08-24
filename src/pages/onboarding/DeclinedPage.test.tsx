// A declined applicant used to be routed to the pending holding page, which says "We'll email
// you the moment you're approved." That was false for them, and — since platform email isn't
// live yet — nothing would ever correct it. They would keep checking back indefinitely.
//
// This page exists so a decision that has been made reads as a decision.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DeclinedPage } from './DeclinedPage'

const profile = { current: { fullName: 'Dana Ortega', role: 'family', status: 'rejected' } }
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: profile.current }) }))
vi.mock('../../lib/auth', () => ({ signOut: vi.fn() }))

const show = () => render(<MemoryRouter><DeclinedPage role="family" /></MemoryRouter>)

describe('DeclinedPage', () => {
  it('never claims the application is still under review', () => {
    show()
    expect(screen.queryByText(/reviewing your application/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/we.ll email you the moment/i)).not.toBeInTheDocument()
  })

  it('says plainly that the application was not accepted', () => {
    show()
    expect(screen.getByText(/not (moving forward|be moving forward|accepted)/i)).toBeInTheDocument()
  })

  it('offers a way to reach a human, since no automated email is coming', () => {
    show()
    // A decision with no recourse and no contact is the thing that makes people call angry.
    expect(screen.getByRole('link', { name: /contact|get in touch|email us/i })).toBeInTheDocument()
  })

  it('does not invite them to complete a profile they cannot use', () => {
    show()
    expect(screen.queryByRole('link', { name: /complete your profile/i })).not.toBeInTheDocument()
  })

  it('lets them log out', () => {
    show()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })
})

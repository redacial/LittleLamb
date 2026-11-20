import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignupPage } from './SignupPage'

// /signup is a real alternate account-creation route (alongside /apply). Little Lamb is a
// job-LISTING service, not an agency (D77 / business plan), so an account cannot be created
// without an AFFIRMATIVE Terms acknowledgment — a passive "by signing up you agree" line is
// not an acknowledgment. These tests pin that both signup paths are gated on the checkbox.

const createAccount = vi.fn()
const signInWithGoogle = vi.fn()

vi.mock('../../lib/auth', () => ({
  createAccount: (...args: unknown[]) => createAccount(...args),
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null }),
}))

beforeEach(() => {
  createAccount.mockReset()
  createAccount.mockResolvedValue(undefined)
  signInWithGoogle.mockReset()
  signInWithGoogle.mockResolvedValue(undefined)
  sessionStorage.clear()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  )
}

async function fillValidFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Dana Whitfield')
  await user.type(screen.getByLabelText(/^email/i), 'dana@example.com')
  await user.type(screen.getByLabelText(/phone/i), '805-555-0142')
  await user.type(screen.getByLabelText(/password/i), 'lambs1234')
}

describe('SignupPage — Terms must be actively accepted', () => {
  it('blocks email/password signup until the Terms box is ticked', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillValidFields(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(createAccount).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/terms/i)
  })

  it('blocks Google signup until the Terms box is ticked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /sign up with google/i }))

    expect(signInWithGoogle).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/terms/i)
  })

  it('creates the account once the box is ticked', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillValidFields(user)
    await user.click(screen.getByRole('checkbox', { name: /responsible for choosing/i }))
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(createAccount).toHaveBeenCalled()
  })
})

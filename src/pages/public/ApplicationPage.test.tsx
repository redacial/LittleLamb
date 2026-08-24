import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApplicationPage } from './ApplicationPage'

// THE BUG THIS PINS:
//
// /apply collects the actual application — neighborhood, children, notes for families;
// years of experience and a personal statement for nannies — and wrote it to
// sessionStorage under 'll_application_draft'. Nothing in src/ ever read that key. It was
// write-only, and sessionStorage dies with the tab.
//
// Two consequences, the second far worse than the first:
//   1. The applicant retypes everything in the setup wizard, despite the holding page
//      promising "your progress is saved".
//   2. Lucy approves families having seen name, email and stage and nothing else. The
//      product's core promise — "we personally review every family" — was not backed by
//      any data reaching the database, let alone the screen. An admin cannot review what
//      was never persisted.
//
// So these tests assert on what reaches createAccount(), i.e. what is written to
// users/{uid}: the application answers must survive signup, and must arrive sanitized and
// length-capped rather than raw (this is untrusted input from an unauthenticated form).

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
      <ApplicationPage />
    </MemoryRouter>,
  )
}

/** Fills the four fields shared by both roles with valid values. */
async function fillSharedFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Dana Whitfield')
  await user.type(screen.getByLabelText(/^email/i), 'dana@example.com')
  await user.type(screen.getByLabelText(/phone/i), '805-555-0142')
  await user.type(screen.getByLabelText(/password/i), 'lambs1234')
}

/** The single argument object handed to createAccount by the most recent submit. */
function submittedPayload(): Record<string, unknown> {
  expect(createAccount).toHaveBeenCalled()
  return createAccount.mock.calls[createAccount.mock.calls.length - 1][0] as Record<string, unknown>
}

describe('ApplicationPage — the family application reaches the database', () => {
  it('persists neighborhood, children and notes so an admin can review the family', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillSharedFields(user)
    await user.type(screen.getByLabelText(/neighborhood/i), 'The Mesa')
    await user.type(screen.getByLabelText(/number of children/i), 'Two kids, ages 3 and 6')
    await user.type(screen.getByLabelText(/special needs or notes/i), 'Peanut allergy.')

    await user.click(screen.getByRole('button', { name: /create account & apply/i }))

    await waitFor(() => expect(createAccount).toHaveBeenCalled())
    const payload = submittedPayload()

    expect(payload.neighborhood).toBe('The Mesa')
    expect(payload.children).toBe('Two kids, ages 3 and 6')
    expect(payload.notes).toBe('Peanut allergy.')
  })

  it('does not carry nanny-only fields onto a family application', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillSharedFields(user)
    await user.type(screen.getByLabelText(/neighborhood/i), 'Riviera')

    await user.click(screen.getByRole('button', { name: /create account & apply/i }))

    await waitFor(() => expect(createAccount).toHaveBeenCalled())
    const payload = submittedPayload()

    expect(payload.yearsExperience).toBeUndefined()
    expect(payload.personalStatement).toBeUndefined()
  })
})

describe('ApplicationPage — the nanny application reaches the database', () => {
  /** Switches the role toggle to nanny. */
  async function chooseNanny(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('radio', { name: /i'm a nanny/i }))
  }

  it('persists years of experience and the personal statement', async () => {
    const user = userEvent.setup()
    renderPage()
    await chooseNanny(user)

    await fillSharedFields(user)
    await user.type(screen.getByLabelText(/years of childcare experience/i), '5')
    await user.type(
      screen.getByLabelText(/short personal statement/i),
      'I have cared for toddlers for five years.',
    )

    await user.click(screen.getByRole('button', { name: /submit application/i }))

    await waitFor(() => expect(createAccount).toHaveBeenCalled())
    const payload = submittedPayload()

    expect(payload.role).toBe('nanny')
    expect(payload.yearsExperience).toBe('5')
    expect(payload.personalStatement).toBe('I have cared for toddlers for five years.')
  })

  it('does not carry family-only fields onto a nanny application', async () => {
    const user = userEvent.setup()
    renderPage()
    await chooseNanny(user)

    await fillSharedFields(user)
    await user.type(screen.getByLabelText(/years of childcare experience/i), '2')

    await user.click(screen.getByRole('button', { name: /submit application/i }))

    await waitFor(() => expect(createAccount).toHaveBeenCalled())
    const payload = submittedPayload()

    expect(payload.neighborhood).toBeUndefined()
    expect(payload.children).toBeUndefined()
    expect(payload.notes).toBeUndefined()
  })
})

describe('ApplicationPage — answers are handed over for sanitization', () => {
  // The page's job is to hand the RIGHT fields over; cleaning and length-capping happen at
  // the write boundary in createAccount() and are covered in src/lib/auth.test.ts. This case
  // pins only that the page does not pre-mangle or drop the raw answer on the way.
  it('passes the typed answer through to createAccount untruncated', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillSharedFields(user)
    await user.click(screen.getByLabelText(/special needs or notes/i))
    await user.paste('Peanut allergy, and a nap at two.')

    await user.click(screen.getByRole('button', { name: /create account & apply/i }))

    await waitFor(() => expect(createAccount).toHaveBeenCalled())
    expect(submittedPayload().notes).toBe('Peanut allergy, and a nap at two.')
  })
})

describe('ApplicationPage — Google signup carries the application too', () => {
  it('passes the family application fields through signInWithGoogle', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/neighborhood/i), 'Goleta')
    await user.type(screen.getByLabelText(/number of children/i), 'One, age 4')

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled())
    const [role, options] = signInWithGoogle.mock.calls[signInWithGoogle.mock.calls.length - 1] as [
      string,
      Record<string, unknown>,
    ]

    expect(role).toBe('family')
    expect(options.neighborhood).toBe('Goleta')
    expect(options.children).toBe('One, age 4')
  })
})

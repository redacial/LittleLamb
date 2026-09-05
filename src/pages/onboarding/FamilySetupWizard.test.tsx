// The data-loss class of wizard bug. Three separate ways a parent's typing was silently
// thrown away:
//
//   A. Abandon at step 2 (Payment), come back -> the wizard restarted at screen one.
//      Nothing persisted which step they were on.
//   B. A second child with an AGE and INTERESTS typed but no name yet was DESTROYED on
//      Continue by a `.filter(c => c.name)` — no warning, no trace.
//   C. A half-filled budget ("20" in min, max still empty) was dropped on the floor,
//      because rateRange was only written when BOTH bounds parsed.
//
// All three are silent. The parent finds out later, or never. These tests assert the
// bytes that reach Firestore, because that is where the loss actually happened.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FamilySetupWizard } from './FamilySetupWizard'
import type { FamilyProfile } from '../../types'

// What the hook hands back as already-saved progress. Tests mutate this to simulate a
// returning family.
const stored: { current: Partial<FamilyProfile> | null } = { current: null }
const save = vi.fn<[Partial<FamilyProfile>], Promise<void>>()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'fam-1' },
    profile: { fullName: 'Dana Ortega', email: 'dana@example.com', role: 'family' },
  }),
}))

// Only the Firestore-touching hooks are faked. resumeStep/childHasContent/ratePatchValue are
// pure logic and must run for real — stubbing them would test the mock, not the fix.
vi.mock('../../hooks/useProfile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useProfile')>()),
  useFamilyProfile: () => ({ profile: stored.current, loading: false, save }),
  useNannyProfile: () => ({ profile: null, loading: false, save }),
  completeWizard: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/storage', () => ({
  uploadProfilePhoto: vi.fn().mockResolvedValue('https://example.test/photo.jpg'),
  uploadIntroVideo: vi.fn().mockResolvedValue('https://example.test/video.mp4'),
}))

// PaymentStep reaches for Stripe; the wizard's step routing is what's under test here.
vi.mock('../../components/onboarding/PaymentStep', () => ({
  PaymentStep: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>Save card</button>
  ),
}))

const show = () => render(<MemoryRouter><FamilySetupWizard /></MemoryRouter>)

/** The merged patch across every save() call — what Firestore ends up holding. */
function savedDoc(): Partial<FamilyProfile> {
  return save.mock.calls.reduce((acc, [patch]) => ({ ...acc, ...patch }), {})
}

/** Every date input on the page, in DOM order (the kids' birthday fields). */
function birthdayInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
}

/** Fill the minimum required fields on step 0 so Continue is allowed through: one child needs a
    name AND a birthday now, plus the home address. Neighborhood was removed. */
async function fillRequiredStep0(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/home address/i), '12 Ocean Rd')
  await user.type(screen.getAllByPlaceholderText('Name')[0], 'Ivy')
  // A birthday well in the past so the computed age is stable.
  await user.type(birthdayInputs()[0], '2021-05-04')
}

beforeEach(() => {
  stored.current = null
  save.mockReset()
  save.mockResolvedValue(undefined)
})

describe('FamilySetupWizard — resuming an abandoned wizard (bug A)', () => {
  it('records which step the family reached, so it can be resumed', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().wizardStep).toBe(1)
  })

  it('reopens on the step the family left off on, not back at screen one', async () => {
    // She got as far as Payment last time and closed the tab.
    stored.current = {
      uid: 'fam-1',
      homeAddress: '12 Ocean Rd',
      children: [{ name: 'Ivy', birthday: '2021-05-04', interests: '' }],
      phone: '805-555-0100',
      wizardStep: 2,
    }
    show()

    expect(await screen.findByRole('heading', { name: /add a payment card/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /tell us about your family/i })).not.toBeInTheDocument()
  })

  it('starts at the beginning for an account saved before wizardStep existed', async () => {
    stored.current = { uid: 'fam-1', homeAddress: '12 Ocean Rd' } // no wizardStep at all
    show()
    expect(await screen.findByRole('heading', { name: /tell us about your family/i })).toBeInTheDocument()
  })
})

describe('FamilySetupWizard — a partially typed child (bug B)', () => {
  it('blocks advancing (rather than silently dropping) a child with a birthday but no name', async () => {
    // The old bug silently destroyed a half-typed child. Now every kept child needs a name AND a
    // birthday, so a partial row surfaces a clear error instead of vanishing — no silent data loss.
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)

    await user.click(screen.getByRole('button', { name: /add another child/i }))
    await user.type(birthdayInputs()[1], '2024-01-02') // birthday, but no name

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/name and a birthday/i)
  })

  it('blocks advancing a child with a name but no birthday', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)

    await user.click(screen.getByRole('button', { name: /add another child/i }))
    await user.type(screen.getAllByPlaceholderText('Name')[1], 'Max') // name, but no birthday

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/name and a birthday/i)
  })

  it('drops a row the parent never touched at all, and advances on the one complete child', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    await user.click(screen.getByRole('button', { name: /add another child/i })) // left blank

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    // The untouched row is dropped; only the complete first child (Ivy) is kept.
    expect(savedDoc().children).toHaveLength(1)
    expect((savedDoc().children ?? [])[0]).toMatchObject({ name: 'Ivy', birthday: '2021-05-04' })
  })
})

// Single-value budget now (partner meeting 2026-09): a family types the MOST they'll pay, stored
// as a {0, ceiling} range. A value still mid-entry (unparseable) is kept as a draft, not dropped.
describe('FamilySetupWizard — the budget (bug C: don’t lose a partial entry)', () => {
  it('keeps a value still being typed as a draft instead of dropping it', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    // "$" alone doesn't parse to a number yet — but must be preserved, not discarded.
    await user.type(screen.getByLabelText(/most you.ll pay/i), '$')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(savedDoc().rateDraft).toMatchObject({ min: '$' })
  })

  it('gives a half-typed budget back when she returns', async () => {
    stored.current = { uid: 'fam-1', homeAddress: '12 Ocean Rd', rateDraft: { min: '3', max: '' } }
    show()
    expect(await screen.findByLabelText(/most you.ll pay/i)).toHaveValue('3')
  })

  it('writes a {0, ceiling} rateRange once a valid amount is entered', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    await user.type(screen.getByLabelText(/most you.ll pay/i), '30')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    // Family ceiling: {0, 3000}.
    expect(savedDoc().rateRange).toEqual({ minCents: 0, maxCents: 3000 })
  })
})

describe('FamilySetupWizard — a failed save (bug D)', () => {
  it('shows the error and stays on the step instead of advancing', async () => {
    const user = userEvent.setup()
    save.mockRejectedValue(new Error('offline'))
    show()
    await fillRequiredStep0(user)
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i)
    expect(screen.getByRole('heading', { name: /tell us about your family/i })).toBeInTheDocument()
  })

  it('does not leave an unhandled rejection behind when a save fails', async () => {
    const user = userEvent.setup()
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    save.mockRejectedValue(new Error('offline'))
    show()
    await fillRequiredStep0(user)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await screen.findByRole('alert')
    await new Promise((r) => setTimeout(r, 50))
    process.off('unhandledRejection', unhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })
})

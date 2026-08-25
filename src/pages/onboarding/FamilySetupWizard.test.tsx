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

// Only the Firestore-touching hooks are faked. resumeStep/childHasContent/ratePatch are
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

/** Fill the minimum required fields on step 0 so Continue is allowed through. */
async function fillRequiredStep0(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/neighborhood/i), 'Mesa')
  await user.type(screen.getByLabelText(/home address/i), '12 Ocean Rd')
  const names = screen.getAllByPlaceholderText('Name')
  await user.type(names[0], 'Ivy')
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
      neighborhood: 'Mesa',
      homeAddress: '12 Ocean Rd',
      children: [{ name: 'Ivy', age: '4', interests: '' }],
      phone: '805-555-0100',
      wizardStep: 2,
    }
    show()

    expect(await screen.findByRole('heading', { name: /add a payment card/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /tell us about your family/i })).not.toBeInTheDocument()
  })

  it('starts at the beginning for an account saved before wizardStep existed', async () => {
    stored.current = { uid: 'fam-1', neighborhood: 'Mesa' } // no wizardStep at all
    show()
    expect(await screen.findByRole('heading', { name: /tell us about your family/i })).toBeInTheDocument()
  })
})

describe('FamilySetupWizard — a partially typed child (bug B)', () => {
  it('keeps a child row that has an age but no name yet', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)

    await user.click(screen.getByRole('button', { name: /add another child/i }))
    const ages = screen.getAllByPlaceholderText('Age')
    const interests = screen.getAllByPlaceholderText('Interests')
    await user.type(ages[1], '2')
    await user.type(interests[1], 'dinosaurs')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    const kids = savedDoc().children ?? []
    expect(kids).toHaveLength(2)
    expect(kids[1]).toMatchObject({ age: '2', interests: 'dinosaurs' })
  })

  it('stores an empty name rather than inventing one for the nameless child', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    await user.click(screen.getByRole('button', { name: /add another child/i }))
    await user.type(screen.getAllByPlaceholderText('Age')[1], '2')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect((savedDoc().children ?? [])[1]?.name).toBe('')
  })

  it('still drops a row the parent never touched at all', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    await user.click(screen.getByRole('button', { name: /add another child/i })) // left blank

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(savedDoc().children).toHaveLength(1)
  })
})

describe('FamilySetupWizard — a half-filled budget (bug C)', () => {
  it('does not lose a minimum typed without a maximum', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    await user.type(screen.getByLabelText(/minimum/i), '20')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(savedDoc().rateDraft).toMatchObject({ min: '20' })
  })

  it('gives the half-filled budget back when she returns', async () => {
    stored.current = { uid: 'fam-1', neighborhood: 'Mesa', rateDraft: { min: '20', max: '' } }
    show()
    expect(await screen.findByLabelText(/minimum/i)).toHaveValue('20')
  })

  it('still writes a real rateRange once both bounds are filled', async () => {
    const user = userEvent.setup()
    show()
    await fillRequiredStep0(user)
    await user.type(screen.getByLabelText(/minimum/i), '20')
    await user.type(screen.getByLabelText(/maximum/i), '30')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(save).toHaveBeenCalled())

    expect(savedDoc().rateRange).toEqual({ minCents: 2000, maxCents: 3000 })
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

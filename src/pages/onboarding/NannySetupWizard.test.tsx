// Same data-loss class as the family wizard, on the nanny side.
//
//   A. Nothing persisted the step, so a nanny who got to Availability and closed the tab
//      came back to "Your photo & bio" and re-clicked the whole flow.
//   C. `finish()` only wrote rateRange when BOTH bounds parsed, so a nanny who typed a
//      minimum and hit Finish had it silently dropped — and unlike the family wizard this
//      is the LAST step, so there is no later screen where she'd notice.
//   D. persist() rethrew into bare `await` callers -> unhandled rejection.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NannySetupWizard } from './NannySetupWizard'
import type { NannyProfile } from '../../types'

const stored: { current: Partial<NannyProfile> | null } = { current: null }
const save = vi.fn<[Partial<NannyProfile>], Promise<void>>()
const completeWizard = vi.fn().mockResolvedValue(undefined)

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'nanny-1' },
    profile: { fullName: 'Rosa Lane', email: 'rosa@example.com', role: 'nanny' },
  }),
}))

// Only the Firestore-touching hooks are faked; the pure helpers run for real.
vi.mock('../../hooks/useProfile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useProfile')>()),
  useNannyProfile: () => ({ profile: stored.current, loading: false, save }),
  useFamilyProfile: () => ({ profile: null, loading: false, save }),
  completeWizard: (...args: unknown[]) => completeWizard(...args),
}))

vi.mock('../../lib/storage', () => ({
  uploadProfilePhoto: vi.fn().mockResolvedValue('https://example.test/photo.jpg'),
  uploadIntroVideo: vi.fn().mockResolvedValue('https://example.test/video.mp4'),
}))

const show = () => render(<MemoryRouter><NannySetupWizard /></MemoryRouter>)

function savedDoc(): Partial<NannyProfile> {
  return save.mock.calls.reduce((acc, [patch]) => ({ ...acc, ...patch }), {})
}

/** A nanny who has already finished steps 0-3 and is sitting on the rate step. */
const atRateStep: Partial<NannyProfile> = {
  uid: 'nanny-1',
  photoURL: 'https://example.test/photo.jpg',
  bio: 'I have looked after children in Santa Barbara for eight happy years.',
  introVideoURL: 'https://example.test/video.mp4',
  selfBadges: ['pet_friendly'],
  availability: [{ day: 1, start: '15:00', end: '20:00' }],
  wizardStep: 4,
}

beforeEach(() => {
  stored.current = null
  save.mockReset()
  save.mockResolvedValue(undefined)
  completeWizard.mockClear()
})

describe('NannySetupWizard — resuming an abandoned wizard (bug A)', () => {
  it('records which step she reached', async () => {
    const user = userEvent.setup()
    stored.current = {
      uid: 'nanny-1',
      photoURL: 'https://example.test/photo.jpg',
      bio: 'I have looked after children in Santa Barbara for eight happy years.',
    }
    show()
    await user.click(await screen.findByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().wizardStep).toBe(1)
  })

  it('reopens on the availability step she left off on', async () => {
    stored.current = { ...atRateStep, wizardStep: 3 }
    show()
    expect(await screen.findByRole('heading', { name: /weekly availability/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /your photo & bio/i })).not.toBeInTheDocument()
  })

  it('starts at the beginning for a profile saved before wizardStep existed', async () => {
    stored.current = { uid: 'nanny-1', bio: 'Hello there' } // no wizardStep
    show()
    expect(await screen.findByRole('heading', { name: /your photo & bio/i })).toBeInTheDocument()
  })
})

describe('NannySetupWizard — a half-filled rate on the final step (bug C)', () => {
  it('does not lose a minimum typed without a maximum', async () => {
    const user = userEvent.setup()
    stored.current = atRateStep
    show()
    await user.type(await screen.findByLabelText(/minimum/i), '25')
    await user.click(screen.getByRole('button', { name: /finish setup/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().rateDraft).toMatchObject({ min: '25' })
  })

  it('gives the half-filled rate back when she returns', async () => {
    stored.current = { ...atRateStep, rateDraft: { min: '25', max: '' } }
    show()
    expect(await screen.findByLabelText(/minimum/i)).toHaveValue('25')
  })

  it('still writes a real rateRange once both bounds are filled', async () => {
    const user = userEvent.setup()
    stored.current = atRateStep
    show()
    await user.type(await screen.findByLabelText(/minimum/i), '25')
    await user.type(screen.getByLabelText(/maximum/i), '40')
    await user.click(screen.getByRole('button', { name: /finish setup/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().rateRange).toEqual({ minCents: 2500, maxCents: 4000 })
  })
})

describe('NannySetupWizard — a failed save (bug D)', () => {
  it('does not claim setup is finished when the final save failed', async () => {
    const user = userEvent.setup()
    stored.current = atRateStep
    save.mockRejectedValue(new Error('offline'))
    show()
    await user.type(await screen.findByLabelText(/minimum/i), '25')
    await user.type(screen.getByLabelText(/maximum/i), '40')
    await user.click(screen.getByRole('button', { name: /finish setup/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i)
    expect(screen.queryByRole('heading', { name: /you.re all set/i })).not.toBeInTheDocument()
    expect(completeWizard).not.toHaveBeenCalled()
  })

  it('does not leave an unhandled rejection behind when a save fails', async () => {
    const user = userEvent.setup()
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    stored.current = atRateStep
    save.mockRejectedValue(new Error('offline'))
    show()
    await user.type(await screen.findByLabelText(/minimum/i), '25')
    await user.type(screen.getByLabelText(/maximum/i), '40')
    await user.click(screen.getByRole('button', { name: /finish setup/i }))
    await screen.findByRole('alert')
    await new Promise((r) => setTimeout(r, 50))
    process.off('unhandledRejection', unhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })
})

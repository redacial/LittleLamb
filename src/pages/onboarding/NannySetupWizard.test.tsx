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
    expect(await screen.findByRole('heading', { name: /your photo & experience/i })).toBeInTheDocument()
  })
})

// Single-value rate now (partner meeting 2026-09): a nanny types the LEAST she'll accept, stored
// as a {floor, RATE_MAX} range. A value still mid-entry (unparseable) is kept as a draft.
describe('NannySetupWizard — the rate on the final step (bug C: don’t lose a partial entry)', () => {
  it('keeps a value still being typed as a draft instead of dropping it', async () => {
    const user = userEvent.setup()
    stored.current = atRateStep
    show()
    await user.type(await screen.findByLabelText(/lowest rate/i), '$')
    await user.click(screen.getByRole('button', { name: /finish setup/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().rateDraft).toMatchObject({ min: '$' })
  })

  it('gives a half-typed rate back when she returns', async () => {
    stored.current = { ...atRateStep, rateDraft: { min: '2', max: '' } }
    show()
    expect(await screen.findByLabelText(/lowest rate/i)).toHaveValue('2')
  })

  it('writes a {floor, RATE_MAX} rateRange once a valid amount is entered', async () => {
    const user = userEvent.setup()
    stored.current = atRateStep
    show()
    await user.type(await screen.findByLabelText(/lowest rate/i), '25')
    await user.click(screen.getByRole('button', { name: /finish setup/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    // Nanny floor: {2500, 50000}.
    expect(savedDoc().rateRange).toEqual({ minCents: 2500, maxCents: 50000 })
  })
})

// Care.com-style onboarding (2026-11): selection-first. Step 0 captures an experience BAND (a
// tapped chip, not typed years) and an OPTIONAL bio; the "about you" step captures specialties /
// activities / approach / languages as chip groups, all optional. These tests pin the written doc.
describe('NannySetupWizard — selection-first step 0 (experience band + optional bio)', () => {
  it('persists the tapped experience band, not a typed number', async () => {
    const user = userEvent.setup()
    stored.current = { uid: 'nanny-1', photoURL: 'https://example.test/photo.jpg' }
    show()
    // Pick an experience band chip.
    await user.click(await screen.findByRole('button', { name: '3–5 years' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().experienceBand).toBe('3_5')
  })

  it('lets a nanny continue with NO bio (bio is now optional)', async () => {
    const user = userEvent.setup()
    // Photo present, no bio at all.
    stored.current = { uid: 'nanny-1', photoURL: 'https://example.test/photo.jpg' }
    show()
    await user.click(await screen.findByRole('button', { name: /continue/i }))

    // It advanced — no "please write a bio" error, and the step was recorded.
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().wizardStep).toBe(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // Photo is now OPTIONAL (lighter signup) — the no-photo advance is covered in the
  // "softened signup gates" block above. The old "still requires a photo" test was removed.

  it('persists an optional bio when one is written', async () => {
    const user = userEvent.setup()
    stored.current = { uid: 'nanny-1', photoURL: 'https://example.test/photo.jpg' }
    show()
    await user.type(await screen.findByLabelText(/bio/i), 'I love tide-pools.')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().bio).toBe('I love tide-pools.')
  })
})

// Lighter signup (2026-11, David): three nanny gates softened to OPTIONAL so a sitter can finish
// setup and start getting found without being blocked. Photo, intro video, and availability are
// all skippable now — the avatar-initials fallback covers a missing photo, and an
// empty-availability sitter is simply not-yet-bookable (the directory handles that). The steps are
// made optional, NOT removed — step indices are unchanged.
describe('NannySetupWizard — softened signup gates (video / photo / availability optional)', () => {
  it('lets a nanny continue past the intro-video step with NO video', async () => {
    const user = userEvent.setup()
    // Sitting on the video step (step 1), photo done, no video.
    stored.current = { uid: 'nanny-1', photoURL: 'https://example.test/photo.jpg', wizardStep: 1 }
    show()
    await screen.findByRole('heading', { name: /record a one-minute intro/i })
    // With no video the CTA reads "Skip for now" (it still advances — video is optional).
    await user.click(screen.getByRole('button', { name: /skip for now/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().wizardStep).toBe(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lets a nanny continue step 0 with NO photo (photo now optional)', async () => {
    const user = userEvent.setup()
    stored.current = { uid: 'nanny-1' } // no photo
    show()
    await user.click(await screen.findByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().wizardStep).toBe(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lets a nanny continue past availability with NO days set', async () => {
    const user = userEvent.setup()
    // Sitting on the availability step (step 3), nothing set.
    stored.current = {
      uid: 'nanny-1',
      photoURL: 'https://example.test/photo.jpg',
      introVideoURL: 'https://example.test/video.mp4',
      wizardStep: 3,
    }
    show()
    await screen.findByRole('heading', { name: /set your weekly availability/i })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().wizardStep).toBe(4)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('NannySetupWizard — the "about you" chip groups', () => {
  /** A nanny sitting on the about-you step (step 2) with photo + video done. */
  const atAboutStep: Partial<NannyProfile> = {
    uid: 'nanny-1',
    photoURL: 'https://example.test/photo.jpg',
    introVideoURL: 'https://example.test/video.mp4',
    wizardStep: 2,
  }

  it('persists selected specialties, activities, approach and languages', async () => {
    const user = userEvent.setup()
    stored.current = atAboutStep
    show()
    await user.click(await screen.findByRole('button', { name: 'Newborns' }))
    await user.click(screen.getByRole('button', { name: 'Arts & crafts' }))
    await user.click(screen.getByRole('button', { name: 'Gentle & nurturing' }))
    await user.click(screen.getByRole('button', { name: 'Spanish' }))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    const doc = savedDoc()
    expect(doc.specialties).toContain('newborns')
    expect(doc.activities).toContain('arts_crafts')
    expect(doc.approaches).toContain('nurturing')
    expect(doc.languages).toContain('spanish')
  })

  it('lets a nanny continue the about-you step with nothing selected (all optional)', async () => {
    const user = userEvent.setup()
    stored.current = atAboutStep
    show()
    // Confirm we're on the about-you step before acting.
    await screen.findByRole('heading', { name: /tell families about you/i })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(savedDoc().wizardStep).toBe(3)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('NannySetupWizard — a failed save (bug D)', () => {
  it('does not claim setup is finished when the final save failed', async () => {
    const user = userEvent.setup()
    stored.current = atRateStep
    save.mockRejectedValue(new Error('offline'))
    show()
    await user.type(await screen.findByLabelText(/lowest rate/i), '25')
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
    await user.type(await screen.findByLabelText(/lowest rate/i), '25')
    await user.click(screen.getByRole('button', { name: /finish setup/i }))
    await screen.findByRole('alert')
    await new Promise((r) => setTimeout(r, 50))
    process.off('unhandledRejection', unhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })
})

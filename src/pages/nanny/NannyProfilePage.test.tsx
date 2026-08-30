import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NannyOwnProfilePage } from './NannyProfilePage'

// ---------------------------------------------------------------------------
// Silent-failure class on the nanny's own profile.
//
// onPhoto/onVideo had NO try/catch at all: uploadProfilePhoto rejecting (file too
// large, storage rules refusal, offline) threw into the void. The avatar never
// changed and the page said nothing, so the nanny re-picked the same oversized
// file over and over. The WIZARD versions of these exact functions already
// handled this correctly — only the post-onboarding editor did not.
//
// onSave was try/finally with no catch: a failed write showed neither "Saved"
// nor an error, i.e. a click that produced literally no feedback of any kind.
//
// The page already DECLARED an `error` state — it was only ever set by the rate
// validator, never by any async path. These tests wire it.
// ---------------------------------------------------------------------------

// vi.hoisted so the spies exist before the hoisted vi.mock factories run.
const { save, uploadProfilePhoto, uploadIntroVideo } = vi.hoisted(() => ({
  save: vi.fn(async () => {}),
  uploadProfilePhoto: vi.fn(async () => 'https://cdn/photo.jpg'),
  uploadIntroVideo: vi.fn(async () => 'https://cdn/video.mp4'),
}))

vi.mock('../../lib/storage', () => ({ uploadProfilePhoto, uploadIntroVideo }))

vi.mock('../../hooks/useProfile', () => ({
  useNannyProfile: () => ({
    profile: { photoURL: null, bio: 'A bio long enough to count.', selfBadges: [], availability: [], verifiedBadges: [] },
    loading: false,
    save,
  }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'n1' }, profile: { fullName: 'Priya Raman', email: 'p@example.com' } }),
}))

const photoFile = new File(['x'], 'me.jpg', { type: 'image/jpeg' })
const videoFile = new File(['x'], 'intro.mp4', { type: 'video/mp4' })

function fileInputFor(labelText: RegExp) {
  const label = screen.getByText(labelText).closest('label')!
  return label.querySelector('input[type="file"]') as HTMLInputElement
}

beforeEach(() => {
  save.mockClear().mockResolvedValue(undefined)
  uploadProfilePhoto.mockClear().mockResolvedValue('https://cdn/photo.jpg')
  uploadIntroVideo.mockClear().mockResolvedValue('https://cdn/video.mp4')
})

describe('NannyProfilePage — a failed upload must say so', () => {
  it('shows an error when the PHOTO upload rejects', async () => {
    uploadProfilePhoto.mockRejectedValueOnce(new Error('Image must be under 5MB.'))
    render(<NannyOwnProfilePage />)

    await userEvent.upload(fileInputFor(/change photo/i), photoFile)

    // The message the storage layer produced is the useful one — "under 5MB" tells her
    // what to do next, where a generic "upload failed" does not.
    expect(await screen.findByRole('alert')).toHaveTextContent(/under 5MB/i)
  })

  it('shows an error when the VIDEO upload rejects', async () => {
    uploadIntroVideo.mockRejectedValueOnce(new Error('Video must be under 1 minute.'))
    render(<NannyOwnProfilePage />)

    await userEvent.upload(fileInputFor(/intro video/i), videoFile)

    expect(await screen.findByRole('alert')).toHaveTextContent(/under 1 minute/i)
  })

  it('shows an error when the upload succeeds but PERSISTING the url fails', async () => {
    // Worse than a failed upload: the avatar visibly updates from the local url while
    // the profile families actually see keeps the old photo.
    save.mockRejectedValueOnce(new Error('permission-denied'))
    render(<NannyOwnProfilePage />)

    await userEvent.upload(fileInputFor(/change photo/i), photoFile)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('NannyProfilePage — a failed save must not read as a no-op', () => {
  it('shows an error instead of silence when the save rejects', async () => {
    save.mockRejectedValueOnce(new Error('permission-denied'))
    render(<NannyOwnProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t|could not|try again/i)
  })

  it('does NOT claim "Saved" when the save rejected', async () => {
    // The specific lie being prevented: try/finally with no catch left the page in a
    // state where neither signal appeared, and the nanny assumed the newer one won.
    save.mockRejectedValueOnce(new Error('permission-denied'))
    render(<NannyOwnProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await screen.findByRole('alert')

    expect(screen.queryByText(/^Saved$/)).not.toBeInTheDocument()
  })

  it('shows "Saved" and no error on the happy path', async () => {
    render(<NannyOwnProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/^Saved$/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('clears a previous error once a later save succeeds', async () => {
    save.mockRejectedValueOnce(new Error('offline'))
    render(<NannyOwnProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await screen.findByRole('alert')

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

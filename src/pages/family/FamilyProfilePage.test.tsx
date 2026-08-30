import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FamilyProfilePage } from './FamilyProfilePage'

// ---------------------------------------------------------------------------
// Same silent-failure class as the nanny profile. onPhoto had no try/catch, so
// a rejected upload (oversized file, storage rules) left the avatar unchanged
// with no message; onSave was try/finally with no catch, so a failed write
// showed neither "Saved" nor an error.
//
// The page already declared an `error` state that only the rate validator ever
// set. These tests wire it to the async paths.
// ---------------------------------------------------------------------------

// vi.hoisted so the spies exist before the hoisted vi.mock factories run.
const { save, uploadProfilePhoto } = vi.hoisted(() => ({
  save: vi.fn(async () => {}),
  uploadProfilePhoto: vi.fn(async () => 'https://cdn/photo.jpg'),
}))

vi.mock('../../lib/storage', () => ({ uploadProfilePhoto }))

vi.mock('../../hooks/useProfile', () => ({
  useFamilyProfile: () => ({
    profile: { photoURL: null, neighborhood: 'Mesa', children: [] },
    loading: false,
    save,
  }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'f1' }, profile: { fullName: 'The Ortegas', email: 'o@example.com' } }),
}))

const photoFile = new File(['x'], 'family.jpg', { type: 'image/jpeg' })

function photoInput() {
  const label = screen.getByText(/change photo/i).closest('label')!
  return label.querySelector('input[type="file"]') as HTMLInputElement
}

beforeEach(() => {
  save.mockClear().mockResolvedValue(undefined)
  uploadProfilePhoto.mockClear().mockResolvedValue('https://cdn/photo.jpg')
})

describe('FamilyProfilePage — a failed upload must say so', () => {
  it('shows an error when the photo upload rejects', async () => {
    uploadProfilePhoto.mockRejectedValueOnce(new Error('Image must be under 5MB.'))
    render(<FamilyProfilePage />)

    await userEvent.upload(photoInput(), photoFile)

    expect(await screen.findByRole('alert')).toHaveTextContent(/under 5MB/i)
  })

  it('shows an error when the upload succeeds but persisting the url fails', async () => {
    save.mockRejectedValueOnce(new Error('permission-denied'))
    render(<FamilyProfilePage />)

    await userEvent.upload(photoInput(), photoFile)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('FamilyProfilePage — a failed save must not read as a no-op', () => {
  it('shows an error instead of silence when the save rejects', async () => {
    save.mockRejectedValueOnce(new Error('permission-denied'))
    render(<FamilyProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t|could not|try again/i)
  })

  it('does NOT claim "Saved" when the save rejected', async () => {
    save.mockRejectedValueOnce(new Error('permission-denied'))
    render(<FamilyProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await screen.findByRole('alert')

    expect(screen.queryByText(/^Saved$/)).not.toBeInTheDocument()
  })

  it('shows "Saved" and no error on the happy path', async () => {
    render(<FamilyProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/^Saved$/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('clears a previous error once a later save succeeds', async () => {
    save.mockRejectedValueOnce(new Error('offline'))
    render(<FamilyProfilePage />)

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await screen.findByRole('alert')

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

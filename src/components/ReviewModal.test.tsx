import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewModal } from './ReviewModal'
import type { Booking } from '../types'

// ---------------------------------------------------------------------------
// save() was try/finally with no catch and no error state. The reviews rules
// require an approved member, so a denied write is a real, reachable outcome —
// and when it happened the modal simply sat there: no "Thank you", no error,
// and the review text the user just wrote was gone the moment they closed it.
//
// Reviews are the only ground-level signal Lucy and David get on match quality,
// so losing one silently is the whole cost of this bug.
// ---------------------------------------------------------------------------

const submit = vi.fn(async () => {})

vi.mock('../hooks/useReviews', () => ({
  useSubmitReview: () => submit,
}))

const booking = {
  id: 'b1',
  familyId: 'f1',
  familyName: 'The Ortegas',
  nannyId: 'n1',
  nannyName: 'Priya',
  date: '2026-08-01',
  startTime: '15:00',
  endTime: '19:00',
  address: '5 Cliff Dr',
  status: 'confirmed',
} as unknown as Booking

function renderModal() {
  return render(
    <ReviewModal open onClose={() => {}} booking={booking} authorId="f1" authorRole="family" />,
  )
}

beforeEach(() => {
  submit.mockClear().mockResolvedValue(undefined)
})

describe('ReviewModal — a denied write must not swallow the review', () => {
  it('shows an error when the submit rejects', async () => {
    submit.mockRejectedValueOnce(new Error('permission-denied'))
    renderModal()

    await userEvent.click(screen.getByRole('button', { name: /submit review/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t|could not|try again/i)
  })

  it('does NOT show the thank-you screen when the submit failed', async () => {
    // The confirmation is the lie being prevented in the other direction: showing
    // "Thank you" for a review that was never written is worse than showing nothing.
    submit.mockRejectedValueOnce(new Error('permission-denied'))
    renderModal()

    await userEvent.click(screen.getByRole('button', { name: /submit review/i }))
    await screen.findByRole('alert')

    expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument()
  })

  it('keeps what the reviewer wrote so they can retry without retyping it', async () => {
    submit.mockRejectedValueOnce(new Error('permission-denied'))
    renderModal()

    const box = screen.getByRole('textbox')
    await userEvent.type(box, 'Priya was wonderful with the twins.')
    await userEvent.click(screen.getByRole('button', { name: /submit review/i }))
    await screen.findByRole('alert')

    expect(box).toHaveValue('Priya was wonderful with the twins.')
  })

  it('lets a retry succeed and clears the error', async () => {
    submit.mockRejectedValueOnce(new Error('offline'))
    renderModal()

    await userEvent.click(screen.getByRole('button', { name: /submit review/i }))
    await screen.findByRole('alert')

    await userEvent.click(screen.getByRole('button', { name: /submit review/i }))

    expect(await screen.findByText(/thank you/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('shows the thank-you and no error on the happy path', async () => {
    renderModal()

    await userEvent.click(screen.getByRole('button', { name: /submit review/i }))

    expect(await screen.findByText(/thank you/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

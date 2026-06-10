import { useState } from 'react'
import { Modal, Button, Textarea } from './ui'
import { cn } from '../lib/cn'
import { useSubmitReview } from '../hooks/useReviews'
import type { Booking, Role } from '../types'

/** Post-booking review (admin-only visibility). Star rating + optional comment. */
export function ReviewModal({
  open,
  onClose,
  booking,
  authorId,
  authorRole,
}: {
  open: boolean
  onClose: () => void
  booking: Booking | null
  authorId: string
  authorRole: Role
}) {
  const submit = useSubmitReview()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function save() {
    if (!booking) return
    setBusy(true)
    try {
      await submit({
        bookingId: booking.id,
        authorId,
        authorRole,
        subjectId: authorRole === 'family' ? booking.nannyId ?? '' : booking.familyId,
        rating,
        comment,
      })
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={done ? 'Thank you' : 'Leave a review'}>
      {done ? (
        <div className="space-y-4">
          <p className="text-charcoal-muted">Your feedback goes straight to the Little Lamb team — it’s never public.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-charcoal-muted">
            Reviews are shared with the Little Lamb team only, to keep matches great.
          </p>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)}
                className={cn('text-3xl', n <= rating ? 'text-terracotta-400' : 'text-charcoal/20')}
              >
                ★
              </button>
            ))}
          </div>
          <Textarea label="Anything you'd like to share?" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button onClick={save} loading={busy}>Submit review</Button>
        </div>
      )}
    </Modal>
  )
}

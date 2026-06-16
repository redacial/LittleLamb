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
          <p className="text-ll-warm-gray">Your feedback goes straight to the Little Lamb team — it’s never public.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ll-warm-gray">
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
                className={cn(
                  'rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ll-terra-deep',
                  n <= rating ? 'text-ll-terra-deep' : 'text-ll-ink/20',
                )}
              >
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
                  <path d="M12 2.5l2.7 5.9 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.1 19.6l1.3-6.2L2.7 9.1l6.3-.7L12 2.5z" />
                </svg>
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

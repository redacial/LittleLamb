// Reviews — write-only for members (admin-only read, enforced by rules). One review per booking.
import { useCallback } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cleanText } from '../lib/sanitize'
import type { Role } from '../types'

export function useSubmitReview() {
  return useCallback(
    async (input: {
      bookingId: string
      authorId: string
      authorRole: Role
      subjectId: string
      rating: number
      comment: string
    }) => {
      await addDoc(collection(db, 'reviews'), {
        ...input,
        rating: Math.max(1, Math.min(5, Math.round(input.rating))),
        comment: cleanText(input.comment, 2000),
        createdAt: serverTimestamp(),
      })
    },
    [],
  )
}

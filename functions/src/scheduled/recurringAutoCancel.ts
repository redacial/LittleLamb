// Scheduled 48h recurring auto-cancel (CLAUDE.md §11.4). Runs hourly; the pure detection
// only flags recurring bookings entering the 48h window whose nanny dropped covering
// availability, so re-runs are safe (already-cancelled bookings are excluded).
//
// Firestore wiring only — all logic is in ./recurringCore (unit-tested with fakes) and
// ../shared/recurring (the pure rule, unit-tested on both client and functions sides).

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebase'
import { REGION } from '../config'
import { runRecurringAutoCancel, type RecurringJobBooking } from './recurringCore'
import type { AvailabilityByNanny } from '../shared/recurring'
import type { NotificationEvent } from '../shared/notifications-events'

export const recurringAutoCancel = onSchedule(
  { schedule: 'every 1 hours', region: REGION, timeZone: 'America/Los_Angeles' },
  async () => {
    const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"

    const result = await runRecurringAutoCancel({
      nowISO: new Date().toISOString(),

      async listCandidateBookings() {
        // Recurring, still-active, dated today or later. (Composite index: recurring + date.)
        const snap = await db
          .collection('bookings')
          .where('recurring', '==', true)
          .where('date', '>=', today)
          .get()
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<RecurringJobBooking, 'id'>) }))
          .filter((b) => b.status === 'confirmed' || b.status === 'pending')
      },

      async getAvailability(nannyId): Promise<AvailabilityByNanny[string]> {
        const snap = await db.collection('nannies').doc(nannyId).get()
        const data = snap.data()
        const avail = data?.availability
        return Array.isArray(avail) ? avail : []
      },

      async cancelBooking(id) {
        await db.collection('bookings').doc(id).update({
          status: 'cancelled',
          cancelReason: 'recurring_availability_conflict',
          cancelledAt: FieldValue.serverTimestamp(),
        })
      },

      async enqueueMail(event: NotificationEvent) {
        await db.collection('mail').add({
          event,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        })
      },
    })

    logger.info('recurringAutoCancel complete', result)
  },
)

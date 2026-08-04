// COPY of the NotificationEvent union from ../../../src/lib/notifications.ts.
//
// Why copied (not imported): this package compiles CommonJS for Node; the client
// compiles under Vite (bundler resolution, import.meta, DOM libs). The union is
// pure types with no runtime, so a copy is safe. `notifications-events.test.ts`
// pins the 13 variant list so drift from the client original fails CI.
//
// The only cross-import in the original is `NannyStage` from src/types — inlined here.

/** Nanny application review stages (mirror of src/types NannyStage). */
export type NannyStage =
  | 'application_received'
  | 'under_review'
  | 'interview_scheduled'
  | 'decision_made'

/** Common booking fields most booking emails reference. */
export interface BookingNotificationBase {
  bookingId: string
  familyId: string
  familyName: string
  nannyId: string | null
  nannyName: string | null
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  address: string
}

/**
 * Discriminated union of every automated notification the platform fires.
 * `type` is the discriminant; `to` records the intended recipient(s).
 * Kept byte-for-byte in step with src/lib/notifications.ts.
 */
export type NotificationEvent =
  | ({ type: 'booking_auto_confirmed'; to: 'family+nanny' } & BookingNotificationBase)
  | ({ type: 'booking_request_sent'; to: 'family+nanny' } & BookingNotificationBase)
  | ({ type: 'booking_request_accepted'; to: 'family' } & BookingNotificationBase)
  | ({ type: 'booking_request_declined'; to: 'family' } & BookingNotificationBase)
  | ({ type: 'open_booking_picked_up'; to: 'family' } & BookingNotificationBase)
  | ({ type: 'recurring_booking_auto_cancelled'; to: 'family+nanny' } & BookingNotificationBase)
  | ({
      type: 'same_day_booking_outcome'
      to: 'family'
      outcome: 'pending' | 'confirmed' | 'not_possible'
    } & BookingNotificationBase)
  | ({ type: 'booking_cancelled_by_family'; to: 'nanny' } & BookingNotificationBase)
  | {
      type: 'application_status_updated'
      to: 'nanny'
      userId: string
      fullName: string
      stage: NannyStage
    }
  | {
      type: 'application_approved'
      to: 'family' | 'nanny'
      userId: string
      fullName: string
    }
  | {
      type: 'application_rejected'
      to: 'family' | 'nanny'
      userId: string
      fullName: string
    }
  | {
      type: 'new_message'
      to: 'recipient'
      conversationId: string
      recipientId: string
      senderName: string
      preview: string
    }

/** Every event `type` value, in declaration order. Drift guard — see the test. */
export const NOTIFICATION_EVENT_TYPES = [
  'booking_auto_confirmed',
  'booking_request_sent',
  'booking_request_accepted',
  'booking_request_declined',
  'open_booking_picked_up',
  'recurring_booking_auto_cancelled',
  'same_day_booking_outcome',
  'booking_cancelled_by_family',
  'application_status_updated',
  'application_approved',
  'application_rejected',
  'new_message',
] as const

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]

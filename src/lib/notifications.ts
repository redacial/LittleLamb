// STUB — no emails are sent. Email provider is a blocking open item (CLAUDE.md #13:
// SendGrid vs Resend, see DECISIONS.md). This module defines every automated-email
// trigger point and its exact payload NOW, so wiring a real provider later is a
// one-file change: replace the body of `deliver()` with a real provider
// (Resend/SendGrid) call. All call sites already pass correct payloads.
//
// The event variants below mirror EXACTLY the automated-email tables in CLAUDE.md
// (Part 19, Section 6, and Section 8). Each variant carries the minimal fields the
// corresponding email body needs (ids, names, date/time, address, stage, etc.).

import type { NannyStage } from '../types'
import { buildICalEvent } from './ical'

/** Common booking fields most booking emails reference. */
interface BookingNotificationBase {
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
 * `type` is the discriminant; `to` records the intended recipient(s) per the
 * CLAUDE.md tables (documentation of who the real provider must email).
 */
export type NotificationEvent =
  // Booking auto-confirmed (within hours) — Family + Nanny | date, time, location + calendar invite
  | ({ type: 'booking_auto_confirmed'; to: 'family+nanny' } & BookingNotificationBase)
  // Booking request sent (outside hours) — Family + Nanny | family: awaiting reply · nanny: accept/decline
  | ({ type: 'booking_request_sent'; to: 'family+nanny' } & BookingNotificationBase)
  // Nanny accepts booking request — Family | confirmed + calendar invite
  | ({ type: 'booking_request_accepted'; to: 'family' } & BookingNotificationBase)
  // Nanny declines booking request — Family | please rebook with another nanny
  | ({ type: 'booking_request_declined'; to: 'family' } & BookingNotificationBase)
  // Open booking picked up by nanny — Family | confirmed + nanny details + calendar invite
  | ({ type: 'open_booking_picked_up'; to: 'family' } & BookingNotificationBase)
  // Recurring booking auto-cancelled — Family + Nanny | availability conflict, please rebook
  | ({ type: 'recurring_booking_auto_cancelled'; to: 'family+nanny' } & BookingNotificationBase)
  // Same-day booking outcome — Family | confirmed or not possible
  | ({
      type: 'same_day_booking_outcome'
      to: 'family'
      outcome: 'pending' | 'confirmed' | 'not_possible'
    } & BookingNotificationBase)
  // Nanny cancellation — Family (notify the assigned family that the nanny cancelled)
  | ({ type: 'booking_cancelled_by_family'; to: 'nanny' } & BookingNotificationBase)
  // Application status updated — Nanny | stage update, fires on each admin advancement
  | {
      type: 'application_status_updated'
      to: 'nanny'
      userId: string
      fullName: string
      stage: NannyStage
    }
  // Application approved — Family | Nanny | account live, next steps
  | {
      type: 'application_approved'
      to: 'family' | 'nanny'
      userId: string
      fullName: string
    }
  // Application rejected — Family | Nanny | application update
  | {
      type: 'application_rejected'
      to: 'family' | 'nanny'
      userId: string
      fullName: string
    }
  // New message received — recipient | message notification
  | {
      type: 'new_message'
      to: 'recipient'
      conversationId: string
      recipientId: string
      senderName: string
      preview: string
    }

const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)

/**
 * The single place a real email provider gets wired in. Today it is a no-op that
 * logs in dev. Replace THIS function body with a Resend/SendGrid call once the
 * provider open item (#13) is resolved — nothing else needs to change.
 */
async function deliver(event: NotificationEvent): Promise<void> {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.info('[notify:stub]', event.type, event)
  }
  // No network call is made. Real provider integration goes here.
}

/**
 * Fire a notification. Type-checks the event shape at compile time and, in dev,
 * logs the payload. Never throws for an unknown/extra field — TS guards the shape.
 * Callers should treat this as fire-and-forget and must not let it block UI.
 */
export async function notify(event: NotificationEvent): Promise<void> {
  await deliver(event)
}

/**
 * Generate a real iCal (.ics) calendar invite for a booking. Open item #14 is
 * resolved in favor of iCal (Google/Apple/Outlook compatible). The email Cloud
 * Function attaches the same output to confirmation emails; this client entry point
 * exists so a "download to calendar" affordance can offer the file directly.
 *
 * @param method REQUEST for a confirmed/updated booking, CANCEL to withdraw it.
 */
export function calendarInvite(
  booking: BookingNotificationBase,
  method: 'REQUEST' | 'CANCEL' = 'REQUEST',
): string {
  return buildICalEvent(booking, { method, organizer: 'hello@littlelambnannies.com' })
}

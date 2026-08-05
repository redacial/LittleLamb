// Pure email rendering: NotificationEvent -> { subject, html, ical? }.
//
// One case per variant, exhaustive over the union (the `never` default makes a
// missing case a COMPILE error). No Firebase, no network — fully unit-tested.
// iCal is attached for confirmation/cancellation booking events; the send function
// turns the returned `ical` string into a real .ics attachment.

import type { NotificationEvent, BookingNotificationBase } from '../shared/notifications-events'
import { buildICalEvent } from '../shared/ical'
import { EMAIL_FROM } from '../config'

export interface RenderedEmail {
  subject: string
  html: string
  ical?: { content: string; method: 'REQUEST' | 'CANCEL' }
}

const BRAND = 'Little Lamb Nannies'

/** Minimal, safe HTML escape for interpolated user-controlled strings. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Wrap body content in a simple branded shell. */
function layout(heading: string, bodyHtml: string): string {
  return [
    `<div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b2b2b">`,
    `<h1 style="font-size:22px;color:#5a7d5a">${esc(heading)}</h1>`,
    bodyHtml,
    `<hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>`,
    `<p style="font-size:12px;color:#999">${BRAND} · Santa Barbara, CA</p>`,
    `</div>`,
  ].join('')
}

/** Human-readable date/time line for a booking. */
function when(b: BookingNotificationBase): string {
  return `${esc(b.date)}, ${esc(b.startTime)}–${esc(b.endTime)}`
}

function bookingParagraph(b: BookingNotificationBase): string {
  const nanny = b.nannyName ? esc(b.nannyName) : 'your nanny'
  return (
    `<p><strong>When:</strong> ${when(b)}<br/>` +
    `<strong>Nanny:</strong> ${nanny}<br/>` +
    `<strong>Family:</strong> ${esc(b.familyName)}<br/>` +
    `<strong>Address:</strong> ${esc(b.address)}</p>`
  )
}

function invite(b: BookingNotificationBase, method: 'REQUEST' | 'CANCEL') {
  return {
    content: buildICalEvent(b, { method, organizer: EMAIL_FROM.replace(/.*<(.+)>.*/, '$1') }),
    method,
  }
}

export function renderEmail(event: NotificationEvent): RenderedEmail {
  switch (event.type) {
    case 'booking_auto_confirmed':
      return {
        subject: `Booking confirmed — ${event.date}`,
        html: layout(
          'Your booking is confirmed',
          `<p>Everything is set. A calendar invite is attached.</p>${bookingParagraph(event)}`,
        ),
        ical: invite(event, 'REQUEST'),
      }

    case 'booking_request_sent':
      return {
        subject: `Booking request sent — ${event.date}`,
        html: layout(
          'Booking request sent',
          `<p>This booking is outside preset hours, so it was sent to the nanny to accept or decline. ` +
            `We'll email you as soon as they respond.</p>${bookingParagraph(event)}`,
        ),
      }

    case 'booking_request_accepted':
      return {
        subject: `Booking confirmed — ${event.date}`,
        html: layout(
          'Your nanny accepted',
          `<p>Your request was accepted and is now confirmed. A calendar invite is attached.</p>` +
            `${bookingParagraph(event)}`,
        ),
        ical: invite(event, 'REQUEST'),
      }

    case 'booking_request_declined':
      return {
        subject: `Booking request declined — ${event.date}`,
        html: layout(
          'Please rebook',
          `<p>Unfortunately the nanny couldn't take this booking. Please choose another nanny for ` +
            `this time.</p>${bookingParagraph(event)}`,
        ),
      }

    case 'open_booking_picked_up':
      return {
        subject: `A nanny picked up your booking — ${event.date}`,
        html: layout(
          'Your booking is confirmed',
          `<p>${esc(event.nannyName ?? 'A nanny')} picked up your open booking. It's confirmed and a ` +
            `calendar invite is attached.</p>${bookingParagraph(event)}`,
        ),
        ical: invite(event, 'REQUEST'),
      }

    case 'recurring_booking_auto_cancelled':
      return {
        subject: `Recurring booking cancelled — ${event.date}`,
        html: layout(
          'A recurring booking was cancelled',
          `<p>The nanny's availability changed, so this recurring instance was automatically ` +
            `cancelled. You have time to arrange other coverage. A cancellation notice is attached.</p>` +
            `${bookingParagraph(event)}`,
        ),
        ical: invite(event, 'CANCEL'),
      }

    case 'same_day_booking_outcome': {
      const map = {
        pending: {
          heading: 'Same-day request received',
          body: `<p>Same-day bookings are handled personally by our team. We'll confirm shortly.</p>`,
        },
        confirmed: {
          heading: 'Same-day booking confirmed',
          body: `<p>Your same-day booking is confirmed.</p>`,
        },
        not_possible: {
          heading: 'Same-day booking not possible',
          body: `<p>We're sorry — we couldn't arrange coverage for this same-day request.</p>`,
        },
      } as const
      const m = map[event.outcome]
      return {
        subject: `Same-day booking — ${event.date}`,
        html: layout(m.heading, `${m.body}${bookingParagraph(event)}`),
        ical: event.outcome === 'confirmed' ? invite(event, 'REQUEST') : undefined,
      }
    }

    case 'booking_cancelled_by_family':
      return {
        subject: `Booking cancelled — ${event.date}`,
        html: layout(
          'A booking was cancelled',
          `<p>A booking assigned to you was cancelled. A cancellation notice is attached.</p>` +
            `${bookingParagraph(event)}`,
        ),
        ical: invite(event, 'CANCEL'),
      }

    case 'application_status_updated': {
      const stageLabel: Record<string, string> = {
        application_received: 'Application received',
        under_review: 'Under review',
        interview_scheduled: 'Interview scheduled',
        decision_made: 'Decision made',
      }
      const label = stageLabel[event.stage] ?? event.stage
      return {
        subject: `Application update — ${label}`,
        html: layout(
          'Your application status changed',
          `<p>Hi ${esc(event.fullName)}, your application is now at: <strong>${esc(label)}</strong>.` +
            (event.stage === 'interview_scheduled'
              ? ` Please use the scheduling link in your dashboard to book your interview.`
              : ``) +
            `</p>`,
        ),
      }
    }

    case 'application_approved':
      return {
        subject: `You're approved — welcome to ${BRAND}`,
        html: layout(
          `Welcome, ${esc(event.fullName)}!`,
          `<p>Your account is live. Log in to complete setup and get started.</p>`,
        ),
      }

    case 'application_rejected':
      return {
        subject: `Application update — ${BRAND}`,
        html: layout(
          'Application update',
          `<p>Hi ${esc(event.fullName)}, thank you for applying. Unfortunately we're not able to move ` +
            `forward at this time.</p>`,
        ),
      }

    default: {
      // Exhaustiveness guard — adding a variant without a case fails to compile.
      const _never: never = event
      throw new Error(`Unhandled notification event: ${JSON.stringify(_never)}`)
    }
  }
}

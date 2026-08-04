// Pure iCal (RFC 5545) generator — no Firebase, no network, no DOM.
//
// This is the client copy of functions/src/shared/ical.ts, kept identical so a
// client "download .ics" preview and the email Cloud Function emit the same file.
// calendarInvite() in notifications.ts wraps this.
//
// Only VEVENT is needed (a single booking). We hand-roll it rather than take a
// dependency: the only fiddly parts are text escaping and 75-octet line folding,
// both handled below. Output validates in Google Calendar, Apple Calendar, Outlook.

/** The booking fields an invite needs. A full BookingNotificationBase satisfies this. */
export interface ICalBooking {
  bookingId: string
  familyName: string
  nannyName: string | null
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  address: string
}

export interface ICalOptions {
  /** REQUEST for a new/updated booking; CANCEL to withdraw it. */
  method: 'REQUEST' | 'CANCEL'
  /**
   * SEQUENCE number. A CANCEL for a booking previously sent as REQUEST should use a
   * higher sequence than the original so clients treat it as an update. Defaults: 0
   * for REQUEST, 1 for CANCEL.
   */
  sequence?: number
  /** Organizer email shown as the meeting organizer. */
  organizer?: string
  /** "now" as an ISO string, injected for deterministic DTSTAMP in tests. */
  nowISO?: string
}

/** Escape a value for a TEXT-typed property (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Fold a content line to 75 octets, continuation lines start with a single space. */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let rest = line
  // First segment up to 75 chars; subsequent up to 74 (leading space counts as one octet).
  parts.push(rest.slice(0, 75))
  rest = rest.slice(75)
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  return parts.join('\r\n')
}

/** "YYYY-MM-DD" + "HH:MM" -> "YYYYMMDDTHHMMSS" (floating local time, no Z). */
function toICalLocal(date: string, time: string): string {
  const d = date.replace(/-/g, '')
  const t = time.replace(/:/g, '') + '00'
  return `${d}T${t}`
}

/** ISO timestamp -> "YYYYMMDDTHHMMSSZ" (UTC) for DTSTAMP. */
function toICalUTC(iso: string): string {
  // Keep only digits, drop millis/offset, force Z. e.g. 2026-06-14T15:00:00.000Z
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/**
 * Build a complete VCALENDAR string for a single booking. The UID is derived from
 * bookingId so a later CANCEL matches the original REQUEST in the recipient's calendar.
 */
export function buildICalEvent(booking: ICalBooking, opts: ICalOptions): string {
  const method = opts.method
  const sequence = opts.sequence ?? (method === 'CANCEL' ? 1 : 0)
  const dtstamp = toICalUTC(opts.nowISO ?? '1970-01-01T00:00:00Z')
  const uid = `booking-${booking.bookingId}@littlelambnannies.com`

  const summary =
    method === 'CANCEL'
      ? `Cancelled: nanny booking${booking.nannyName ? ` with ${booking.nannyName}` : ''}`
      : `Nanny booking${booking.nannyName ? ` with ${booking.nannyName}` : ''}`
  const description =
    `Little Lamb Nannies booking for ${booking.familyName}` +
    (booking.nannyName ? ` with ${booking.nannyName}` : '') +
    `.`

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Little Lamb Nannies//Booking//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toICalLocal(booking.date, booking.startTime)}`,
    `DTEND:${toICalLocal(booking.date, booking.endTime)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(booking.address)}`,
  ]
  if (opts.organizer) {
    lines.push(`ORGANIZER:mailto:${opts.organizer}`)
  }
  if (method === 'CANCEL') {
    lines.push('STATUS:CANCELLED')
  } else {
    lines.push('STATUS:CONFIRMED')
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')

  // Fold each line then join with CRLF per spec.
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

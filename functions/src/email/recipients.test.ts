import { describe, it, expect } from 'vitest'
import { resolveRecipients, type DocReader } from './recipients'
import type { NotificationEvent } from '../shared/notifications-events'

/** In-memory reader: { 'users/f1': {email}, 'families/f1': {coParentEmail} }. */
function fakeReader(docs: Record<string, Record<string, unknown>>): DocReader {
  return { async get(col, id) { return docs[`${col}/${id}`] ?? null } }
}

const booking = {
  bookingId: 'b1', familyId: 'f1', familyName: 'Fam', nannyId: 'n1', nannyName: 'Nan',
  date: '2026-07-02', startTime: '09:00', endTime: '12:30', address: 'addr',
}

describe('resolveRecipients', () => {
  it('family+nanny resolves both account emails', async () => {
    const reader = fakeReader({
      'users/f1': { email: 'fam@x.com' },
      'users/n1': { email: 'nan@x.com' },
    })
    const to = await resolveRecipients(reader, { type: 'booking_auto_confirmed', to: 'family+nanny', ...booking })
    expect(to.sort()).toEqual(['fam@x.com', 'nan@x.com'])
  })

  it('adds co-parent email for family events when present', async () => {
    const reader = fakeReader({
      'users/f1': { email: 'fam@x.com' },
      'families/f1': { coParentEmail: 'co@x.com' },
    })
    const to = await resolveRecipients(reader, { type: 'booking_request_accepted', to: 'family', ...booking })
    expect(to.sort()).toEqual(['co@x.com', 'fam@x.com'])
  })

  it('routes quarterly_invoice to the family (incl. co-parent), never a nanny', async () => {
    // This variant carries no nannyId, so it must NOT fall through to the booking branch.
    const reader = fakeReader({
      'users/f1': { email: 'fam@x.com' },
      'users/n1': { email: 'nan@x.com' },
      'families/f1': { coParentEmail: 'co@x.com' },
    })
    const to = await resolveRecipients(reader, {
      type: 'quarterly_invoice',
      to: 'family',
      familyId: 'f1',
      familyName: 'Fam',
      invoiceId: 'inv1',
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
      totalCents: 3400,
      bookingCount: 9,
    })
    expect(to.sort()).toEqual(['co@x.com', 'fam@x.com'])
    expect(to).not.toContain('nan@x.com')
  })

  it('dedupes when co-parent equals the account email', async () => {
    const reader = fakeReader({
      'users/f1': { email: 'fam@x.com' },
      'families/f1': { coParentEmail: 'fam@x.com' },
    })
    const to = await resolveRecipients(reader, { type: 'booking_request_accepted', to: 'family', ...booking })
    expect(to).toEqual(['fam@x.com'])
  })

  it('falls back to families.primaryEmail when the account email is missing', async () => {
    const reader = fakeReader({ 'families/f1': { primaryEmail: 'primary@x.com' } })
    const to = await resolveRecipients(reader, { type: 'booking_request_accepted', to: 'family', ...booking })
    expect(to).toEqual(['primary@x.com'])
  })

  it('routes application_* events by userId, not booking ids', async () => {
    const reader = fakeReader({ 'users/u9': { email: 'applicant@x.com' } })
    const ev: NotificationEvent = { type: 'application_approved', to: 'nanny', userId: 'u9', fullName: 'Ada' }
    expect(await resolveRecipients(reader, ev)).toEqual(['applicant@x.com'])
  })

  it('returns [] when nothing resolves (caller skips, does not crash)', async () => {
    const reader = fakeReader({})
    const to = await resolveRecipients(reader, { type: 'booking_cancelled_by_family', to: 'nanny', ...booking })
    expect(to).toEqual([])
  })
})

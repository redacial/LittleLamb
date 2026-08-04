// Resolve a NotificationEvent to the list of email addresses that should receive it.
//
// Runs server-side because only admin-privileged code may read across users' private
// email fields. The event carries ids/names but not always an email, so we look them
// up: users/{uid}.email is canonical for everyone; for family-facing booking emails we
// also add families/{familyId}.coParentEmail when present.
//
// A minimal Firestore-reader interface is injected so this is unit-testable with fakes.

import type { NotificationEvent } from '../shared/notifications-events'

export interface DocReader {
  /** Return the doc data for `col/id`, or null if it doesn't exist. */
  get(col: string, id: string): Promise<Record<string, unknown> | null>
}

function emailOf(data: Record<string, unknown> | null): string | null {
  const e = data?.email
  return typeof e === 'string' && e.length > 0 ? e : null
}

async function userEmail(reader: DocReader, uid: string | null): Promise<string | null> {
  if (!uid) return null
  return emailOf(await reader.get('users', uid))
}

/** Family recipients: the family's account email + co-parent email if set. */
async function familyEmails(reader: DocReader, familyId: string): Promise<string[]> {
  const out: string[] = []
  const acct = await userEmail(reader, familyId)
  if (acct) out.push(acct)
  const fam = await reader.get('families', familyId)
  const co = fam?.coParentEmail
  if (typeof co === 'string' && co.length > 0 && co !== acct) out.push(co)
  // Fall back to families.primaryEmail if the account email was somehow missing.
  if (out.length === 0) {
    const primary = fam?.primaryEmail
    if (typeof primary === 'string' && primary.length > 0) out.push(primary)
  }
  return out
}

/**
 * Returns the deduped recipient list for an event. Empty array = nobody resolvable
 * (caller should record this and skip, not crash).
 */
export async function resolveRecipients(
  reader: DocReader,
  event: NotificationEvent,
): Promise<string[]> {
  const set = new Set<string>()
  const add = (emails: (string | null)[]) => emails.forEach((e) => e && set.add(e))

  // Non-booking events carry a userId/recipientId rather than family/nanny ids, so we
  // route on `type` for those and use the `to` discriminant only for booking events.
  switch (event.type) {
    case 'application_status_updated':
    case 'application_approved':
    case 'application_rejected':
      add([await userEmail(reader, event.userId)])
      break
    case 'new_message':
      add([await userEmail(reader, event.recipientId)])
      break
    default:
      // All remaining variants are booking events with a family/nanny `to`.
      if (event.to === 'family+nanny' || event.to === 'family') {
        add(await familyEmails(reader, event.familyId))
      }
      if (event.to === 'family+nanny' || event.to === 'nanny') {
        add([await userEmail(reader, event.nannyId)])
      }
      break
  }

  return [...set]
}

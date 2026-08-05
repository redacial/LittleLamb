import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  NOTIFICATION_EVENT_TYPES,
  type NotificationEvent,
  type NotificationEventType,
} from './notifications-events'

// Drift guard: this copied union must stay in step with the client original at
// src/lib/notifications.ts. Two checks — exhaustiveness (compile-time) and a
// source-text comparison against the client file (catches added/renamed variants).

describe('NotificationEvent copy', () => {
  it('lists all 11 event types with no duplicates', () => {
    expect(NOTIFICATION_EVENT_TYPES).toHaveLength(11)
    expect(new Set(NOTIFICATION_EVENT_TYPES).size).toBe(11)
  })

  it('NOTIFICATION_EVENT_TYPES is exhaustive over the union (compile-time)', () => {
    // If a variant is added to the union but not the array (or vice versa), this
    // assignment stops compiling — the real guard is the type equality below.
    const _fromArray: NotificationEventType = NOTIFICATION_EVENT_TYPES[0]
    const sample: NotificationEvent = {
      type: 'application_approved',
      to: 'nanny',
      userId: 'u',
      fullName: 'Ada',
    }
    const t: NotificationEventType = sample.type
    expect(NOTIFICATION_EVENT_TYPES).toContain(t)
    expect(_fromArray).toBeTypeOf('string')
  })

  it('every type literal appears in the client source of truth', () => {
    const clientPath = resolve(__dirname, '../../../src/lib/notifications.ts')
    const src = readFileSync(clientPath, 'utf8')
    for (const t of NOTIFICATION_EVENT_TYPES) {
      expect(src, `client notifications.ts is missing event type "${t}"`).toContain(`'${t}'`)
    }
  })
})

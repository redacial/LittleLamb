// Badge catalog. Admin can edit this master list in Settings (Phase 4) — these are the
// seed defaults. Final list is an open item pending Lucy; documented in CLAUDE.md.
import type { BadgeType } from '../types'

export interface BadgeDef {
  id: string
  label: string
  type: BadgeType
}

export const SELF_BADGES: BadgeDef[] = [
  { id: 'pet_friendly', label: 'Pet-Friendly', type: 'self' },
  { id: 'ages_0_2', label: 'Ages 0–2', type: 'self' },
  { id: 'ages_3_7', label: 'Ages 3–7', type: 'self' },
  { id: 'ages_8_12', label: 'Ages 8–12', type: 'self' },
  { id: 'newborn', label: 'Newborn Experience', type: 'self' },
  { id: 'multiples', label: 'Twins & Multiples', type: 'self' },
  { id: 'homework', label: 'Homework Help', type: 'self' },
  { id: 'swim', label: 'Water-Safe', type: 'self' },
]

export const VERIFIED_BADGES: BadgeDef[] = [
  { id: 'cpr', label: 'CPR Certified', type: 'verified' },
  { id: 'first_aid', label: 'First Aid Certified', type: 'verified' },
  { id: 'background_check', label: 'Background Checked', type: 'verified' },
  { id: 'interviewed', label: 'Interviewed', type: 'verified' },
]

const ALL = [...SELF_BADGES, ...VERIFIED_BADGES]

export function badgeLabel(id: string): string {
  return ALL.find((b) => b.id === id)?.label ?? id
}
export function badgeType(id: string): BadgeType {
  return ALL.find((b) => b.id === id)?.type ?? 'self'
}

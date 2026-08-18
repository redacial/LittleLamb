// Badge catalog. Admin edits the master list in Settings > Badges, which persists to
// config/badges. These constants are the SEED DEFAULTS and the permanent fallback: if the
// config doc is missing, unreadable, or malformed, every consumer still gets a full catalog.
// Final list is an open item pending Lucy; documented in CLAUDE.md.
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

/** The seed catalog, both types together — what `config/badges` is initialized from. */
export const DEFAULT_BADGES: BadgeDef[] = [...SELF_BADGES, ...VERIFIED_BADGES]

/**
 * Live catalog backing the module-level `badgeLabel` / `badgeType` lookups.
 *
 * Why a module-level mutable register rather than threading a catalog through props: four
 * existing consumers (NannyProfilePage x2, NanniesDirectory, the setup wizard) call
 * `badgeLabel(id)` as a plain function. Making the catalog a hook argument would force a
 * signature change on all of them, and other agents are editing those files concurrently.
 * `useBadgeCatalog()` publishes the config doc here on every snapshot, so those call sites
 * keep compiling AND start reflecting admin edits without being touched.
 */
let registry: BadgeDef[] = DEFAULT_BADGES

/** Called by useBadgeCatalog when config/badges changes. Not for component use. */
export function setBadgeRegistry(badges: BadgeDef[]) {
  // Never let a malformed/empty config doc blank out every badge label in the app —
  // an empty catalog would render every nanny's chips as raw ids.
  registry = badges.length > 0 ? badges : DEFAULT_BADGES
}

/** Current catalog — config values when loaded, seed defaults otherwise. */
export function allBadges(): BadgeDef[] {
  return registry
}

/**
 * Ids are the stable key persisted on nanny docs; labels are admin-editable. An id with no
 * catalog entry falls back to rendering the id itself rather than disappearing, so a badge
 * retired in Settings still shows on the nannies who already earned it.
 */
export function badgeLabel(id: string): string {
  return registry.find((b) => b.id === id)?.label ?? id
}
export function badgeType(id: string): BadgeType {
  return registry.find((b) => b.id === id)?.type ?? 'self'
}

/** Slugify a label into a stable id. Used when admin adds a badge in Settings. */
export function badgeIdFromLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'badge'
  )
}

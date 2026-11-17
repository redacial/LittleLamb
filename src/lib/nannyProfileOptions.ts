// Selection catalogs for the Care.com-style nanny onboarding (2026-11). The wizard is built
// around TAPPING chips, not typing: a nanny picks an experience band, then builds an "about me"
// from four chip groups (specialties, activities, approach, languages), then an optional
// fun-fact prompt. Free text is minimized and optional throughout.
//
// Each catalog is a flat list of { id, label }. IDs are stable and stored on the profile; labels
// are display-only (safe to reword). Keep IDs kebab-case and never reuse an ID for a new meaning.

export interface Option {
  id: string
  label: string
}

/** Single-select experience bands — replaces the old free-text "years of experience". */
export const EXPERIENCE_BANDS: Option[] = [
  { id: 'lt_1', label: 'Less than 1 year' },
  { id: '1_2', label: '1–2 years' },
  { id: '3_5', label: '3–5 years' },
  { id: '6_10', label: '6–10 years' },
  { id: '10_plus', label: '10+ years' },
]

/** "I'm great with" — care-type specialties (ages live in badges; these are care contexts). */
export const SPECIALTIES: Option[] = [
  { id: 'newborns', label: 'Newborns' },
  { id: 'toddlers', label: 'Toddlers' },
  { id: 'big_kids', label: 'Big kids' },
  { id: 'special_needs', label: 'Special needs' },
  { id: 'multiples', label: 'Twins & multiples' },
  { id: 'bedtime', label: 'Bedtime routines' },
  { id: 'picky_eaters', label: 'Picky eaters' },
  { id: 'newborn_overnight', label: 'Overnight care' },
]

/** "Activities I bring" — what a nanny does with kids. SB flavor included (beach/tide-pools). */
export const ACTIVITIES: Option[] = [
  { id: 'arts_crafts', label: 'Arts & crafts' },
  { id: 'outdoor_play', label: 'Outdoor play' },
  { id: 'reading', label: 'Reading' },
  { id: 'music', label: 'Music' },
  { id: 'cooking', label: 'Cooking & baking' },
  { id: 'homework', label: 'Homework help' },
  { id: 'sports', label: 'Sports' },
  { id: 'beach', label: 'Beach & tide-pools' },
]

/** "My approach" — caregiving style. */
export const APPROACHES: Option[] = [
  { id: 'nurturing', label: 'Gentle & nurturing' },
  { id: 'playful', label: 'Playful & energetic' },
  { id: 'structured', label: 'Structured & routine-focused' },
  { id: 'patient', label: 'Calm & patient' },
  { id: 'creative', label: 'Creative' },
  { id: 'montessori', label: 'Montessori-minded' },
]

/** Languages spoken — a real fit/trust signal for families. */
export const LANGUAGES: Option[] = [
  { id: 'english', label: 'English' },
  { id: 'spanish', label: 'Spanish' },
  { id: 'mandarin', label: 'Mandarin' },
  { id: 'french', label: 'French' },
  { id: 'german', label: 'German' },
  { id: 'tagalog', label: 'Tagalog' },
  { id: 'asl', label: 'ASL' },
]

/**
 * Fun-fact prompts — a nanny picks one and writes a short, OPTIONAL answer. The prompt gives the
 * blank a shape so it's easy to fill without staring at an empty box. The `{answer}` is where the
 * nanny's words go; the stored funFact is the composed line.
 */
export interface FunFactPrompt {
  id: string
  /** What the nanny picks. */
  label: string
  /** The lead-in shown before their short answer, e.g. "My superpower is". */
  lead: string
  /** Placeholder nudging the kind of answer. */
  placeholder: string
}

export const FUN_FACT_PROMPTS: FunFactPrompt[] = [
  { id: 'superpower', label: 'My superpower is…', lead: 'My superpower is', placeholder: 'turning broccoli into a treat' },
  { id: 'kids_love', label: 'Kids love that I…', lead: 'Kids love that I', placeholder: 'can name every dinosaur' },
  { id: 'find_me', label: "You'll always find me…", lead: "You'll always find me", placeholder: 'at the beach with a bucket of chalk' },
  { id: 'best_at', label: "I'm secretly the best at…", lead: "I'm secretly the best at", placeholder: 'building blanket forts' },
]

/** Quick-pick interest chips for the fun-fact step — pure selection, no typing required. */
export const INTERESTS: Option[] = [
  { id: 'beach_days', label: 'Beach days' },
  { id: 'board_games', label: 'Board games' },
  { id: 'baking', label: 'Baking' },
  { id: 'crafts', label: 'Crafts' },
  { id: 'hiking', label: 'Hiking' },
  { id: 'animals', label: 'Animals' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'gardening', label: 'Gardening' },
  { id: 'dancing', label: 'Dancing' },
]

/** Every catalog by its profile field, so a label lookup can resolve any stored id. */
const ALL_OPTIONS: Option[] = [
  ...EXPERIENCE_BANDS,
  ...SPECIALTIES,
  ...ACTIVITIES,
  ...APPROACHES,
  ...LANGUAGES,
  ...INTERESTS,
]

/** Human label for a stored id; falls back to the id so an unknown value never renders blank. */
export function optionLabel(id: string): string {
  return ALL_OPTIONS.find((o) => o.id === id)?.label ?? id
}

/** The display label for an experience band id (e.g. '3_5' → '3–5 years'). */
export function experienceLabel(id: string | undefined): string {
  if (!id) return ''
  return EXPERIENCE_BANDS.find((b) => b.id === id)?.label ?? id
}

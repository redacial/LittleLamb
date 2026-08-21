// Policy copy. Admin edits these in Settings > Policies, which persists to config/policies.
// These constants are the SEED DEFAULTS and the permanent per-field fallback: if the config
// doc is missing, unreadable, or malformed, families and nannies still see a complete
// policies page. Final content is an open item pending Lucy; documented in CLAUDE.md.
//
// Text is plain, newline-separated paragraphs — deliberately NOT Markdown or HTML. This copy
// is rendered on a page every user sees, so keeping it inert text keeps admin input off the
// XSS surface entirely rather than relying on a sanitizer.

export interface Policies {
  /** Platform-wide rules, shown to every role. */
  platform: string
  /** Shown to families only. */
  family: string
  /** Shown to nannies only. */
  nanny: string
}

export const DEFAULT_POLICIES: Policies = {
  platform: [
    'Treat every member of the community with kindness and respect.',
    'Communicate through the platform so the Little Lamb team can support you if anything comes up.',
    'Every nanny is background-checked and personally interviewed before their profile goes live.',
  ].join('\n'),
  family: [
    'Cancellations are made from your Calendar or Bookings page; your nanny is notified automatically.',
    'Quarterly billing covers the platform — wages are arranged directly with your nanny.',
  ].join('\n'),
  nanny: [
    'Keep your availability current so families only book times that work for you.',
    'Cancellations are handled with the Little Lamb team — message us and we’ll take care of it.',
  ].join('\n'),
}

/**
 * Coerce a raw `config/policies` document into a complete Policies object.
 *
 * Falls back FIELD BY FIELD rather than all-or-nothing: if Lucy clears one block, or a
 * hand-edit in the Firebase console leaves one field a number, the other two blocks must
 * survive. A blank policies page is a trust failure on the page whose entire job is
 * explaining how cancellations and billing work.
 */
export function parsePolicies(raw: unknown): Policies {
  const d = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const pick = (key: keyof Policies): string => {
    const v = d[key]
    // Whitespace-only counts as unset — an accidentally-cleared textarea should restore the
    // default, not render an empty card.
    return typeof v === 'string' && v.trim() ? v : DEFAULT_POLICIES[key]
  }
  return { platform: pick('platform'), family: pick('family'), nanny: pick('nanny') }
}

/** Split a policy block into renderable paragraphs, dropping blank lines. */
export function policyParagraphs(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

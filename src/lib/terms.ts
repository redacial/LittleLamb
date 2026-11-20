// Terms of Service copy for Little Lamb Nannies.
//
// ⚠️ This is an honest, platform-accurate DRAFT written to match the Little Lamb LLC business
// plan's legal model: Little Lamb is a California JOB-LISTING SERVICE, not an employment agency.
// It is NOT legal advice. Per the business plan, an attorney (Ramon Gupta, Mullen & Henzell) is
// to review the terms-of-service, the listing-model classification, and the IP assignment before
// public launch. Keep this in step with what the platform actually does.
//
// The whole point of these terms is the thing that keeps Little Lamb a listing service rather
// than an agency: Little Lamb does NOT employ, place, recommend, match, screen, interview, or
// verify sitters. Families choose, interview, vet, hire, and pay their own sitter. Credentials
// are self-reported. If any of that stops being true in the product, these terms are wrong and
// the legal classification is at risk — change the product, not just the words.
//
// Same inert-plain-text posture as src/lib/policies.ts / privacy.ts — sections are heading +
// newline-separated paragraphs, never Markdown/HTML, so nothing here is an XSS surface.

export interface TermsSection {
  heading: string
  body: string
}

/** Effective date — update when the terms materially change. */
export const TERMS_EFFECTIVE = 'November 2026'

export const TERMS_SECTIONS: TermsSection[] = [
  {
    heading: 'What Little Lamb is',
    body: [
      'Little Lamb Nannies ("Little Lamb", "we") is a local job-listing service operated by Little Lamb LLC in Santa Barbara, California. We provide a platform where families post childcare jobs and browse sitter profiles, and where sitters list their availability and credentials.',
      'Little Lamb is not an employment agency, a staffing agency, or an employer. We do not employ, place, recommend, match, screen, interview, or verify sitters, and we are not a party to any arrangement a family and a sitter make.',
    ].join('\n'),
  },
  {
    heading: 'Families are responsible for hiring',
    body: [
      'You, the family, are solely responsible for choosing, interviewing, vetting, and hiring any sitter, and for deciding whether they are right for your family and your home.',
      'You are responsible for any employment obligations that arise from hiring a sitter, including wages, taxes, insurance, and compliance with applicable law. You pay your sitter directly; no money for wages passes through Little Lamb.',
      'Credentials shown on a profile (such as TrustLine, CPR, First Aid, or references) are self-reported by the sitter and are not verified by Little Lamb. Confirm anything that matters to you directly with the sitter.',
    ].join('\n'),
  },
  {
    heading: 'Sitters',
    body: [
      'Anyone in the Santa Barbara area may create a free sitter account. Sitters build their own profile, set their own availability, and accept jobs directly from families.',
      'List only credentials you actually hold and keep your profile accurate. Your pay is arranged directly with the family; Little Lamb never takes a cut of your wages and never charges sitters.',
    ].join('\n'),
  },
  {
    heading: 'Fees',
    body: [
      'Families pay a subscription to use Little Lamb. Your first two bookings are free; after that a yearly subscription applies. Sitters are never charged.',
      'Fees are for access to the listing service only, not for placement of any particular sitter.',
    ].join('\n'),
  },
  {
    heading: 'Conduct and removal',
    body: [
      'Use Little Lamb honestly and treat other members with respect. Do not misrepresent yourself, your credentials, or your needs.',
      'Little Lamb may remove any profile, post, or account that breaks these terms or our community guidelines, at our discretion. If something concerns you, report it to the Little Lamb team.',
    ].join('\n'),
  },
  {
    heading: 'No warranty; limitation of liability',
    body: [
      'Little Lamb provides the platform "as is." Because we do not screen, verify, or supervise sitters or families, we make no representation or warranty about any sitter, family, booking, or the care provided. Any arrangement is between the family and the sitter.',
      'To the fullest extent permitted by law, Little Lamb is not liable for the acts, omissions, or conduct of any family or sitter, or for the outcome of any booking arranged through the platform.',
    ].join('\n'),
  },
  {
    heading: 'Contact',
    body: [
      'Little Lamb LLC is based in Santa Barbara, California. Questions about these terms? Contact the Little Lamb team through the details on our website.',
    ].join('\n'),
  },
]

/** Split a terms block into renderable paragraphs, dropping blank lines. */
export function termsParagraphs(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

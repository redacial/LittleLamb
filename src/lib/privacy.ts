// Privacy policy copy for Little Lamb Nannies.
//
// ⚠️ This is an honest, platform-accurate DRAFT seeded from the product's real data practices
// (see the user-flow docs + the billing/data model). It is NOT legal advice. Lucy & David
// should have it reviewed before public launch; for a closed beta it is defensible so long as
// it stays accurate to what the platform actually does. Keep it in step with the code: if a
// collection or a third party changes, change this.
//
// Same inert-plain-text posture as src/lib/policies.ts — sections are heading + newline-
// separated paragraphs, never Markdown/HTML, so nothing here is an XSS surface.

export interface PrivacySection {
  heading: string
  body: string
}

/** The platform's effective date — update when the policy materially changes. */
export const PRIVACY_EFFECTIVE = 'November 2026'

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    heading: 'Who we are',
    body: [
      'Little Lamb Nannies ("Little Lamb", "we") connects Santa Barbara families with pre-screened nannies. This policy explains what we collect, why, and the choices you have.',
      'Little Lamb is based in Santa Barbara, California. Questions: contact the Little Lamb team through the details on our website.',
    ].join('\n'),
  },
  {
    heading: 'What we collect',
    body: [
      'Account details you provide: your name, email, phone number, and the role you sign up as (family or nanny).',
      'Family profiles: your home address, your children’s first names and ages, pets, allergies and special needs, and notes you add for your nanny. You enter this to make bookings work; we do not sell it.',
      'Nanny profiles: your photo, short bio, a self-recorded intro video, the badges you select, and your weekly availability.',
      'Booking activity: the bookings you make or accept, their dates, times, locations, and any notes.',
      'Payment information (families only): your card is stored and charged by our payment processor, Stripe. Little Lamb never sees or stores your full card number.',
      'Basic technical data needed to keep the service secure and working, such as sign-in and security-check signals.',
    ].join('\n'),
  },
  {
    heading: 'How we use it',
    body: [
      'To run the service: create your account, match families with nannies, schedule and confirm bookings, and send the related emails (confirmations, approvals, invoices).',
      'To keep everyone safe: every nanny is background-checked and interviewed before their profile goes live, and we require two-factor sign-in to protect your account.',
      'To bill families: a flat quarterly platform fee plus a small per-booking fee, charged through Stripe.',
      'We do not sell your personal information, and we do not use it for advertising.',
    ].join('\n'),
  },
  {
    heading: 'Who can see your information',
    body: [
      'Families and nannies see each other only as needed to book: a family browsing nannies sees public nanny profiles; a nanny you book sees the booking details needed to do the job, including your address and notes.',
      'The Little Lamb team (the two founders) can see account and booking information to run the platform and help when something comes up.',
      'Service providers who process data on our behalf: Google Firebase (hosting, database, authentication, file storage), Stripe (payments), and Resend (email delivery). They may only use it to provide their service to us.',
      'Reviews you leave go only to the Little Lamb team — they are never shown publicly.',
    ].join('\n'),
  },
  {
    heading: 'How we protect it',
    body: [
      'Data is stored with Google Firebase and protected by access rules so that, for example, one family cannot read another family’s information.',
      'Connections use HTTPS encryption. Two-factor authentication is required for every account.',
      'No system is perfectly secure, but we work to protect your information and to limit who can access it.',
    ].join('\n'),
  },
  {
    heading: 'Your choices',
    body: [
      'You can view and edit your profile at any time from your account.',
      'You can request that your account be deactivated from Settings; contact us to have your data removed.',
      'You can reach the Little Lamb team with any question about your data or this policy.',
    ].join('\n'),
  },
  {
    heading: 'Children’s information',
    body: [
      'Family accounts are held by parents or guardians, who enter limited information about their children (first names, ages, and care notes) solely to arrange childcare. Children do not hold accounts. We ask families to share only what a nanny needs to care for their child well.',
    ].join('\n'),
  },
  {
    heading: 'Changes',
    body: [
      'We may update this policy as the platform grows. When we make a material change we will update the date above and, where appropriate, let you know.',
    ].join('\n'),
  },
]

/** Split a section body into renderable paragraphs, dropping blank lines. */
export function privacyParagraphs(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

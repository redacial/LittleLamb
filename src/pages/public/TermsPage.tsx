import { PublicShell } from './PublicShell'
import { TERMS_SECTIONS, TERMS_EFFECTIVE, termsParagraphs } from '../../lib/terms'

/**
 * Public Terms of Service (/terms). Reachable before signup and linked from the public footer and
 * the application form — the listing-service disclaimers (Little Lamb is not an employer or
 * agency; families are responsible for vetting and hiring; credentials are self-reported) are
 * what keep Little Lamb legally a job-listing service, so they must be visible to everyone, not
 * gated behind auth (D77 + the business-plan legal model).
 *
 * Content is inert plain text from src/lib/terms.ts (no Markdown/HTML), consistent with the
 * privacy and policies pages. It is an accurate draft, not legal advice — see the note in terms.ts.
 */
export function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-prose px-5 py-14 sm:px-8">
        <h1 className="font-display text-display-md">Terms of Service</h1>
        <p className="mt-2 font-mono text-mono-sm text-ll-warm-gray">
          Effective {TERMS_EFFECTIVE}
        </p>
        <p className="mt-4 text-ll-warm-gray">
          Little Lamb is a local job-listing service — a place to find each other, not an agency.
          Here’s how it works and what each side is responsible for, in plain language.
        </p>

        <div className="mt-10 space-y-9">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-display-sm text-ll-ink">{section.heading}</h2>
              <div className="prose-sm mt-2 space-y-2 text-ll-ink">
                {termsParagraphs(section.body).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicShell>
  )
}

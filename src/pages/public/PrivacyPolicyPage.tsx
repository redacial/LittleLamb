import { PublicShell } from './PublicShell'
import { PRIVACY_SECTIONS, PRIVACY_EFFECTIVE, privacyParagraphs } from '../../lib/privacy'

/**
 * Public privacy policy (/privacy). Reachable before signup — families must be able to read how
 * their home address and children's details are handled BEFORE they hand them over, so this
 * sits outside auth and is linked from the signup form and the public footer.
 *
 * Content is inert plain text from src/lib/privacy.ts (no Markdown/HTML), consistent with the
 * in-app Policies page. It is an accurate draft, not legal advice — see the note in privacy.ts.
 */
export function PrivacyPolicyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-prose px-5 py-14 sm:px-8">
        <h1 className="font-display text-display-md">Privacy Policy</h1>
        <p className="mt-2 font-mono text-mono-sm text-ll-warm-gray">
          Effective {PRIVACY_EFFECTIVE}
        </p>
        <p className="mt-4 text-ll-warm-gray">
          Your family’s trust is the whole point of Little Lamb. Here’s exactly what we collect,
          why, and who can see it — in plain language.
        </p>

        <div className="mt-10 space-y-9">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-display-sm text-ll-ink">{section.heading}</h2>
              <div className="prose-sm mt-2 space-y-2 text-ll-ink">
                {privacyParagraphs(section.body).map((line, i) => (
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

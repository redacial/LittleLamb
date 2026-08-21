import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel } from '../../components/ui'
import { usePolicies } from '../../hooks/useAdmin'
import { policyParagraphs } from '../../lib/policies'

/**
 * Policies page, shared by families + nannies. Platform-wide rules on top, role-specific below.
 *
 * Content is admin-editable in Settings > Policies (config/policies). The hook falls back
 * per-field to the shipped defaults, so a missing or malformed config doc renders exactly
 * what this page rendered before it was config-backed — never an empty card.
 */
export function PoliciesPage({ role }: { role: 'family' | 'nanny' }) {
  const { policies } = usePolicies()

  return (
    <>
      <PageHeader title="Policies" subtitle="How we keep Little Lamb safe and trustworthy." />
      <PageBody>
        <div className="max-w-prose space-y-6">
          <Card>
            <CardLabel>Little Lamb policies</CardLabel>
            <PolicyText text={policies.platform} />
          </Card>

          <Card>
            <CardLabel>{role === 'family' ? 'Family policies' : 'Nanny policies'}</CardLabel>
            <PolicyText text={role === 'family' ? policies.family : policies.nanny} />
          </Card>
        </div>
      </PageBody>
    </>
  )
}

/**
 * Renders a policy block as paragraphs split on newlines.
 *
 * Deliberately plain text, not Markdown or HTML: this is admin-authored copy displayed to
 * every family and nanny on the platform, so rendering it as markup would put an XSS
 * surface on the most-read shared page for the sake of bold text nobody asked for.
 */
function PolicyText({ text }: { text: string }) {
  return (
    <div className="prose-sm mt-2 space-y-2 text-ll-ink">
      {policyParagraphs(text).map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  )
}

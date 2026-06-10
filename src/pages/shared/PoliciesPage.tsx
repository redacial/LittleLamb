import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel } from '../../components/ui'

/**
 * Policies page, shared by families + nannies. Platform-wide rules on top, role-specific below.
 * Content is editable by admin in Settings (Phase 4) — these are sensible defaults until then.
 */
export function PoliciesPage({ role }: { role: 'family' | 'nanny' }) {
  return (
    <>
      <PageHeader title="Policies" subtitle="How we keep Little Lamb safe and trustworthy." />
      <PageBody>
        <div className="max-w-prose space-y-6">
          <Card>
            <CardLabel>Little Lamb policies</CardLabel>
            <div className="prose-sm mt-2 space-y-2 text-charcoal">
              <p>Treat every member of the community with kindness and respect.</p>
              <p>Communicate through the platform so the Little Lamb team can support you if anything comes up.</p>
              <p>Every nanny is background-checked and personally interviewed before their profile goes live.</p>
            </div>
          </Card>

          <Card>
            <CardLabel>{role === 'family' ? 'Family policies' : 'Nanny policies'}</CardLabel>
            <div className="prose-sm mt-2 space-y-2 text-charcoal">
              {role === 'family' ? (
                <>
                  <p>Cancellations are made from your Calendar or Bookings page; your nanny is notified automatically.</p>
                  <p>Quarterly billing covers the platform — wages are arranged directly with your nanny.</p>
                </>
              ) : (
                <>
                  <p>Keep your availability current so families only book times that work for you.</p>
                  <p>Cancellations are handled with the Little Lamb team — message us and we’ll take care of it.</p>
                </>
              )}
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

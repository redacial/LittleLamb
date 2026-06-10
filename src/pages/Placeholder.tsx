import { PageHeader, PageBody } from '../components/layout/AppLayout'
import { Card, CardLabel } from '../components/ui'

/**
 * Layout-aware scaffold for Phase 4 screens not yet built. Renders inside AppLayout's main
 * column (no own chrome), so the sidebar + nav stay intact while the screen is filled in.
 * Swapped out per route as each real screen lands. Tracked in Backlog.md.
 */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={note} />
      <PageBody>
        <Card className="bg-cream-100">
          <CardLabel>Coming together</CardLabel>
          <p className="text-sm text-charcoal-muted">
            This screen is part of the core app build. The navigation, layout, and data wiring are
            in place — the detailed view lands here next.
          </p>
        </Card>
      </PageBody>
    </>
  )
}

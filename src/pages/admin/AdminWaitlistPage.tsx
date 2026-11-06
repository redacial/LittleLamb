import { useState } from 'react'
import { useWaitlist, type WaitlistEntry } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, Button, StatusPill, LoadErrorNotice, TruncatedNotice } from '../../components/ui'
import { cn } from '../../lib/cn'

type Tab = 'all' | 'waitlist' | 'contact'

/**
 * Admin Waitlist page. Shows everyone who raised their hand on the public landing site — the
 * pre-launch waitlist signups and contact-form messages — newest first, so Lucy & David can see
 * interest building and reach out. Read-only: these are prospects, not accounts (an account is
 * created only when someone actually applies). Each row offers a one-click email reply.
 *
 * Dense work surface, same calm posture as the other admin list pages: no tilt/grain, colour
 * only on the tab strip and the role pill.
 */
export function AdminWaitlistPage() {
  const { items, loading, error, truncated, loadMore, loadingMore } = useWaitlist()
  const [tab, setTab] = useState<Tab>('all')

  const filtered = items.filter((e) => (tab === 'all' ? true : e.kind === tab))

  return (
    <>
      <PageHeader
        title="Waitlist"
        subtitle="Everyone who’s expressed interest from the website — newest first."
      />
      <PageBody>
        <div
          role="tablist"
          className="mb-5 flex gap-1 rounded-full border-1.5 border-ll-cream-dark bg-ll-cream-dark p-1"
        >
          {(['all', 'waitlist', 'contact'] as Tab[]).map((t) => {
            const selected = tab === t
            return (
              <button
                key={t}
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-sm font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-sage focus-visible:ring-offset-2 focus-visible:ring-offset-ll-cream',
                  selected ? 'bg-ll-cream text-ll-ink shadow-sm' : 'text-ll-warm-gray hover:text-ll-ink',
                )}
              >
                {t === 'all' ? 'All' : t === 'waitlist' ? 'Waitlist' : 'Messages'}
              </button>
            )
          })}
        </div>

        {error ? (
          <LoadErrorNotice what="the waitlist" />
        ) : loading ? (
          <p className="text-ll-warm-gray">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <p className="text-ll-warm-gray">
              {tab === 'contact'
                ? 'No contact messages yet.'
                : 'No one on the waitlist yet. Signups from the landing site will appear here.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <WaitlistRow key={entry.id} entry={entry} />
            ))}
            {truncated && (
              <TruncatedNotice
                shown={filtered.length}
                what="signups"
                onLoadMore={loadMore}
                loadingMore={loadingMore}
              />
            )}
          </div>
        )}
      </PageBody>
    </>
  )
}

function WaitlistRow({ entry }: { entry: WaitlistEntry }) {
  const when = entry.createdAt?.toDate?.()
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ll-ink">{entry.name}</span>
            <StatusPill status={entry.role} tone={entry.role === 'nanny' ? 'open' : 'confirmed'} />
            {entry.kind === 'contact' && <StatusPill status="message" tone="neutral" />}
          </div>
          <a
            href={`mailto:${entry.email}`}
            className="mt-1 block truncate text-sm text-ll-sage-deep underline-offset-2 hover:underline"
          >
            {entry.email}
          </a>
          {entry.phone && <p className="text-sm text-ll-warm-gray">{entry.phone}</p>}
          {entry.message && (
            <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm text-ll-ink">{entry.message}</p>
          )}
          {entry.source && (
            <p className="mt-1 font-mono text-mono-sm text-ll-warm-gray">from {entry.source}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {when && (
            <time
              dateTime={when.toISOString()}
              className="whitespace-nowrap font-mono text-mono-sm text-ll-warm-gray"
            >
              {when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </time>
          )}
          <a href={`mailto:${entry.email}`}>
            <Button variant="secondary" size="sm">
              Email
            </Button>
          </a>
        </div>
      </div>
    </Card>
  )
}

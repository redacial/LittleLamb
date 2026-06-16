import { useState } from 'react'
import { useUsersByRole, useAdminActions } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, Button, Avatar, StatusPill } from '../../components/ui'
import { cn } from '../../lib/cn'
import type { NannyStage, Role, UserDoc } from '../../types'

type Tab = 'active' | 'pending' | 'inactive' | 'rejected'

const NANNY_STAGES: NannyStage[] = ['application_received', 'under_review', 'interview_scheduled', 'decision_made']
const STAGE_LABEL: Record<NannyStage, string> = {
  application_received: 'Application received',
  under_review: 'Under review',
  interview_scheduled: 'Interview scheduled',
  decision_made: 'Decision made',
}

/**
 * Admin management of nannies or families. Tabs by status; approve/reject + advance stage.
 * Theme note: this is a dense work surface — rows stay calm (no tilt, no grain). Only the
 * tab strip and status pills carry colour; motion is limited to button hover/focus.
 */
export function AdminPeoplePage({ role }: { role: Extract<Role, 'nanny' | 'family'> }) {
  const { users, loading } = useUsersByRole(role)
  const { approve, reject, advanceStage } = useAdminActions()
  const [tab, setTab] = useState<Tab>('pending')

  const filtered = users.filter((u) => {
    if (tab === 'active') return u.approved && u.status === 'approved'
    if (tab === 'pending') return !u.approved && u.status === 'pending'
    if (tab === 'rejected') return u.status === 'rejected'
    return u.status === 'inactive'
  })

  return (
    <>
      <PageHeader title={role === 'nanny' ? 'Nannies' : 'Families'} subtitle="Review applications and manage accounts." />
      <PageBody>
        <div
          role="tablist"
          className="mb-5 flex gap-1 rounded-full border-1.5 border-ll-cream-dark bg-ll-cream-dark p-1"
        >
          {(['pending', 'active', 'inactive', 'rejected'] as Tab[]).map((t) => {
            const selected = tab === t
            return (
              <button
                key={t}
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-sm font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-sage focus-visible:ring-offset-2 focus-visible:ring-offset-ll-cream',
                  selected
                    ? 'bg-ll-sage-light text-ll-sage-deep shadow-soft'
                    : 'text-ll-warm-gray hover:text-ll-ink',
                )}
              >
                {t}
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="text-ll-warm-gray">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card className="bg-ll-cream"><p className="text-sm text-ll-warm-gray">Nobody in this list.</p></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <PersonRow
                key={u.uid}
                user={u}
                role={role}
                onApprove={() => approve(u.uid)}
                onReject={() => reject(u.uid)}
                onAdvance={(s) => advanceStage(u.uid, s)}
              />
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}

function PersonRow({
  user: u,
  role,
  onApprove,
  onReject,
  onAdvance,
}: {
  user: UserDoc
  role: 'nanny' | 'family'
  onApprove: () => void
  onReject: () => void
  onAdvance: (s: NannyStage) => void
}) {
  const nextStage =
    role === 'nanny' && u.stage
      ? NANNY_STAGES[Math.min(NANNY_STAGES.indexOf(u.stage) + 1, NANNY_STAGES.length - 1)]
      : null

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={u.fullName} size="md" />
        <div className="min-w-0">
          <p className="font-semibold text-ll-ink">{u.fullName}</p>
          <p className="text-sm text-ll-warm-gray">{u.email}</p>
          {role === 'nanny' && u.stage && (
            <p className="mt-0.5 font-mono text-mono-sm text-ll-sage-deep">{STAGE_LABEL[u.stage]}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={u.status} tone={u.status === 'approved' ? 'confirmed' : u.status === 'rejected' ? 'cancelled' : 'pending'} />
        {!u.approved && u.status === 'pending' && (
          <>
            {role === 'nanny' && nextStage && u.stage !== 'decision_made' && (
              <Button size="sm" variant="ghost" onClick={() => onAdvance(nextStage)}>
                Advance
                <ArrowRight />
              </Button>
            )}
            <Button size="sm" onClick={onApprove}>Approve</Button>
            <Button size="sm" variant="secondary" onClick={onReject}>Reject</Button>
          </>
        )}
      </div>
    </Card>
  )
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

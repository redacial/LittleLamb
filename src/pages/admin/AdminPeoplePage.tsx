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

/** Admin management of nannies or families. Tabs by status; approve/reject + advance stage. */
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
        <div className="mb-4 flex gap-1 rounded-full bg-cream-200 p-1">
          {(['pending', 'active', 'inactive', 'rejected'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 text-sm font-bold capitalize transition-colors',
                tab === t ? 'bg-white text-charcoal shadow-soft' : 'text-charcoal-muted',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-charcoal-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card className="bg-cream-100"><p className="text-sm text-charcoal-muted">Nobody in this list.</p></Card>
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
        <div>
          <p className="font-semibold">{u.fullName}</p>
          <p className="text-sm text-charcoal-muted">{u.email}</p>
          {role === 'nanny' && u.stage && (
            <p className="mt-0.5 text-xs text-sage-700">{STAGE_LABEL[u.stage]}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={u.status} tone={u.status === 'approved' ? 'confirmed' : u.status === 'rejected' ? 'cancelled' : 'pending'} />
        {!u.approved && u.status === 'pending' && (
          <>
            {role === 'nanny' && nextStage && u.stage !== 'decision_made' && (
              <Button size="sm" variant="ghost" onClick={() => onAdvance(nextStage)}>
                Advance →
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

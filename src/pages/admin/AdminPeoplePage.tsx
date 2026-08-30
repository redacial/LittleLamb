import { useState } from 'react'
import { useUsersByRole, useAdminActions } from '../../hooks/useAdmin'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, Button, Avatar, StatusPill, LoadErrorNotice, TruncatedNotice, Modal } from '../../components/ui'
import { VerifiedBadgesModal } from '../../components/admin/VerifiedBadgesModal'
import { PersonReviewsModal } from '../../components/admin/PersonReviewsModal'
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
  const { users, loading, error, truncated, loadMore, loadingMore } = useUsersByRole(role)
  const { approve, reject, reinstate, advanceStage } = useAdminActions()
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

        {/* A failed read must never render as "Nobody in this list" — an empty approvals
            queue reads as "no applicants" while real people sit unreviewed. */}
        {error && <LoadErrorNotice what={role === 'nanny' ? 'the nanny list' : 'the family list'} />}

        {/* Rendered per-tab, not only when the whole list is long: the tabs filter
            client-side, so a partial read can hide pending applicants under a tab that
            looks empty. */}
        {truncated && !error && (
          <div className="mb-4">
            <TruncatedNotice
              shown={users.length}
              what={role === 'nanny' ? 'nannies' : 'families'}
              onLoadMore={loadMore}
              loadingMore={loadingMore}
            />
          </div>
        )}

        {loading ? (
          <p className="text-ll-warm-gray">Loading…</p>
        ) : error ? null : filtered.length === 0 ? (
          <Card className="bg-ll-cream">
            <p className="text-sm text-ll-warm-gray">
              Nobody in this list{truncated ? ' yet — load more to keep looking.' : '.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <PersonRow
                key={u.uid}
                user={u}
                role={role}
                onApprove={() => approve(u.uid, u.fullName, role)}
                onReject={() => reject(u.uid, u.fullName, role)}
                onReinstate={() => reinstate(u.uid)}
                onAdvance={(s) => advanceStage(u.uid, s, u.fullName)}
              />
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}

/**
 * What the applicant actually wrote on /apply.
 *
 * Until this existed, Lucy approved families seeing a name, an email and nothing else — so
 * "we personally review every family" was not backed by any data on screen. The answers were
 * being collected and thrown away (they went to sessionStorage, which nothing read).
 *
 * Every field is optional by design: accounts created before this shipped have none of them,
 * and a RETURNING Google user keeps their existing doc, so absence is normal and must render
 * as nothing rather than as "undefined".
 */
function ApplicationSummary({ user: u, role }: { user: UserDoc; role: 'nanny' | 'family' }) {
  const rows =
    role === 'family'
      ? [
          { label: 'Neighbourhood', value: u.neighborhood },
          { label: 'Children', value: u.children },
          { label: 'Notes', value: u.notes },
        ]
      : [
          { label: 'Experience', value: u.yearsExperience },
          { label: 'About', value: u.personalStatement },
        ]
  const filled = rows.filter((r) => r.value?.trim())
  if (!filled.length) return null

  return (
    <dl className="mt-2 space-y-1">
      {filled.map((r) => (
        <div key={r.label} className="flex gap-2 text-sm">
          <dt className="shrink-0 font-mono text-mono-sm uppercase tracking-wide text-ll-warm-gray">
            {r.label}
          </dt>
          {/* Free text the applicant typed — wrap it rather than truncating. An allergy note
              cut off mid-sentence is worse than a taller row. */}
          <dd className="min-w-0 whitespace-pre-wrap break-words text-ll-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PersonRow({
  user: u,
  role,
  onApprove,
  onReject,
  onReinstate,
  onAdvance,
}: {
  user: UserDoc
  role: 'nanny' | 'family'
  // Promise-returning by contract, not `() => void`: `run` below awaits these to catch a
  // failed write, and a void-typed callback would silently discard the rejection — which
  // is precisely the bug this row is being fixed for.
  onApprove: () => Promise<unknown>
  onReject: () => Promise<unknown>
  onReinstate: () => Promise<unknown>
  onAdvance: (s: NannyStage) => Promise<unknown>
}) {
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Approve / reject / reinstate / advance were fire-and-forget — the promise was created
   * and dropped. A permission-denied or an offline write produced nothing on screen, and
   * because these rows are driven by a Firestore snapshot that never changed, the row
   * simply stayed put. Lucy reads a row that didn't move as "the list hasn't refreshed",
   * not as "that write failed".
   *
   * The rejection case is the expensive one: she confirms, sees no error, and moves on
   * believing the applicant is declined — while the account is still pending and still
   * approvable. That is how an unvetted family gets in the door.
   *
   * The error is scoped to the ROW, not the page: the message has to say which person is
   * still sitting in the wrong state, and a page-level banner over a long list wouldn't.
   */
  async function run(action: () => Promise<unknown>, verb: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch {
      setError(`We couldn’t ${verb} ${u.fullName}. Nothing was changed — please try again.`)
    } finally {
      setBusy(false)
    }
  }

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
          {u.phone && <p className="text-sm text-ll-warm-gray">{u.phone}</p>}
          {role === 'nanny' && u.stage && (
            <p className="mt-0.5 font-mono text-mono-sm text-ll-sage-deep">{STAGE_LABEL[u.stage]}</p>
          )}
          <ApplicationSummary user={u} role={role} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={u.status} tone={u.status === 'approved' ? 'confirmed' : u.status === 'rejected' ? 'cancelled' : 'pending'} />
        {/* The post-interview pass. Offered on every nanny regardless of status: Lucy
            often confirms CPR/First Aid during the interview, i.e. BEFORE the approve
            click, and re-verifies certs that lapse long after. */}
        {role === 'nanny' && (
          <Button size="sm" variant="ghost" onClick={() => setBadgesOpen(true)}>
            Badges
          </Button>
        )}
        {/* Offered for BOTH roles: reviews run in both directions (a nanny reviews the
            family too), and until now nothing in the app read the collection back at all. */}
        <Button size="sm" variant="ghost" onClick={() => setReviewsOpen(true)}>
          Reviews
        </Button>
        {!u.approved && u.status === 'pending' && (
          <>
            {role === 'nanny' && nextStage && u.stage !== 'decision_made' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => onAdvance(nextStage), 'advance')}
              >
                Advance
                <ArrowRight />
              </Button>
            )}
            <Button size="sm" disabled={busy} onClick={() => run(onApprove, 'approve')}>
              Approve
            </Button>
            {/* Deliberately asymmetric: Approve fires straight away, Reject asks first.
                Approving by mistake is undone in seconds; rejecting used to be permanent. */}
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmReject(true)}
            >
              Reject
            </Button>
          </>
        )}
        {/* The way back out of a misclick. Without this the rejected tab was a dead end —
            the row landed here and no control on the page could move it again. */}
        {u.status === 'rejected' && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(onReinstate, 'reinstate')}>
            Reinstate
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="w-full rounded-ll-input border-1.5 border-red-400 bg-white px-3 py-2 text-sm font-semibold text-red-600"
        >
          {error}
        </p>
      )}
      {role === 'nanny' && (
        <VerifiedBadgesModal
          uid={u.uid}
          fullName={u.fullName}
          open={badgesOpen}
          onClose={() => setBadgesOpen(false)}
        />
      )}
      <PersonReviewsModal
        uid={u.uid}
        fullName={u.fullName}
        open={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
      />
      <Modal
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        title={`Reject ${u.fullName}?`}
      >
        <p className="text-sm text-ll-warm-gray">
          <span className="font-semibold text-ll-ink">{u.fullName}</span> ({u.email}) will be
          declined and moved to the rejected tab. Their account stays inactive and they can’t
          use the platform.
        </p>
        {/* Naming the email gap is the point. Lucy would otherwise reasonably assume the
            platform breaks the news for her, and the applicant is left refreshing a holding
            page that says they'll hear back. */}
        <p className="mt-3 text-sm text-ll-warm-gray">
          They <span className="font-semibold text-ll-ink">won’t be notified</span> — platform
          email isn’t live yet, so nothing is sent automatically. If they should know, contact
          them yourself.
        </p>
        <p className="mt-3 text-sm text-ll-warm-gray">
          You can undo this from the rejected tab.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReject(false)}>
            Keep application
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmReject(false)
              void run(onReject, 'reject')
            }}
          >
            Reject application
          </Button>
        </div>
      </Modal>
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

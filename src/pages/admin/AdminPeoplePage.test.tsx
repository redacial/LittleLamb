import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminPeoplePage } from './AdminPeoplePage'
import type { UserDoc } from '../../types'

// These tests exist for ONE bug class: a failed or partial read rendering as an empty one.
// Until D61 this page destructured only { users, loading } from its hook, so a
// permission error or outage rendered "Nobody in this list" — an admin would reasonably
// read that as "no applicants" while real people sat unreviewed. That is the D50 failure,
// and it was live on this page for several sessions precisely because nothing tested it.

const hookResult = {
  users: [] as UserDoc[],
  items: [] as UserDoc[],
  loading: false,
  error: null as Error | null,
  truncated: false,
  hasMore: false,
  loadingMore: false,
  loadMore: vi.fn(),
}

vi.mock('../../hooks/useAdmin', () => ({
  useUsersByRole: () => hookResult,
  useAdminActions: () => ({ approve: vi.fn(), reject: vi.fn(), advanceStage: vi.fn() }),
}))

function reset(over: Partial<typeof hookResult> = {}) {
  Object.assign(hookResult, {
    users: [],
    items: [],
    loading: false,
    error: null,
    truncated: false,
    hasMore: false,
    loadingMore: false,
    ...over,
  })
}

beforeEach(() => reset())

describe('AdminPeoplePage — partial and failed reads', () => {
  it('shows a load error instead of "Nobody in this list" when the read fails', () => {
    reset({ error: new Error('permission-denied') })

    render(<AdminPeoplePage role="nanny" />)

    expect(screen.queryByText(/Nobody in this list/i)).not.toBeInTheDocument()
    // LoadErrorNotice's copy makes the distinction explicit, which is the whole point:
    // "This is a loading problem, not an empty list."
    expect(screen.getByText(/loading problem, not an empty list/i)).toBeInTheDocument()
  })

  it('still says the list is empty when the read SUCCEEDS and returns nothing', () => {
    // The counterpart to the test above: this page must distinguish "we failed" from
    // "there genuinely is nobody", or the fix would just hide the empty state.
    render(<AdminPeoplePage role="nanny" />)

    expect(screen.getByText(/Nobody in this list/i)).toBeInTheDocument()
  })

  it('warns that the list is partial, and offers to load more', () => {
    reset({ truncated: true, hasMore: true })

    render(<AdminPeoplePage role="family" />)

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  it('does not offer to load more while the read is failing', () => {
    // A "load more" button next to a load error invites clicking through a broken read.
    reset({ error: new Error('permission-denied'), truncated: true })

    render(<AdminPeoplePage role="family" />)

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })
})

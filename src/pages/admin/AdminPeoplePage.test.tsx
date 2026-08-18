import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPeoplePage } from './AdminPeoplePage'
import { SELF_BADGES, VERIFIED_BADGES } from '../../lib/badges'
import type { UserDoc } from '../../types'

const nannyBadges = { current: [] as string[] }

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

const saveVerifiedBadges = vi.fn(async () => {})

vi.mock('../../hooks/useAdmin', () => ({
  useUsersByRole: () => hookResult,
  useAdminActions: () => ({ approve: vi.fn(), reject: vi.fn(), advanceStage: vi.fn() }),
  useNannyVerifiedBadges: () => ({
    verifiedBadges: nannyBadges.current,
    loading: false,
    save: saveVerifiedBadges,
  }),
  useBadgeCatalog: () => ({
    badges: [...SELF_BADGES, ...VERIFIED_BADGES],
    self: SELF_BADGES,
    verified: VERIFIED_BADGES,
    loading: false,
    save: vi.fn(),
  }),
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

beforeEach(() => {
  reset()
  nannyBadges.current = []
  saveVerifiedBadges.mockClear()
})

/** The page opens on the 'pending' tab; approved people live under 'active'. */
async function openActiveTab() {
  await userEvent.click(screen.getByRole('tab', { name: /^active$/i }))
}

function approvedNanny(over: Partial<UserDoc> = {}): UserDoc {
  return {
    uid: 'nanny-1',
    fullName: 'Maria Reyes',
    email: 'maria@example.com',
    role: 'nanny',
    approved: true,
    status: 'approved',
    ...over,
  } as UserDoc
}

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


// The post-interview workflow: Lucy interviews a nanny offline, then needs to mark which
// VERIFIED badges she earned. Before this, no admin surface wrote `verifiedBadges` at all —
// the field existed on the type and was admin-writable in the rules, but the only way to set
// it was the Firebase console. This suite pins the whole round trip.
describe('AdminPeoplePage — assigning verified badges after an interview', () => {
  it('opens a badge editor for an approved nanny', async () => {
    reset({ users: [approvedNanny()], items: [approvedNanny()] })

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /badges/i }))

    // The dialog must offer every VERIFIED badge as a toggle — that is the whole point of
    // the post-interview pass.
    const dialog = await screen.findByRole('dialog')
    for (const b of VERIFIED_BADGES) {
      expect(within(dialog).getByRole('checkbox', { name: new RegExp(b.label, 'i') })).toBeInTheDocument()
    }
  })

  it('does NOT offer self-reported badges — those belong to the nanny, not the admin', async () => {
    reset({ users: [approvedNanny()], items: [approvedNanny()] })

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /badges/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('checkbox', { name: /Pet-Friendly/i })).not.toBeInTheDocument()
  })

  it('reflects the badges the nanny already has as checked', async () => {
    nannyBadges.current = ['cpr']
    reset({ users: [approvedNanny()], items: [approvedNanny()] })

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /badges/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('checkbox', { name: /CPR Certified/i })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /First Aid/i })).not.toBeChecked()
  })

  it('saves the toggled badge IDS (not labels) for the right nanny', async () => {
    // Ids are what lives on the nanny doc and what badgeLabel() resolves against, so
    // writing labels here would orphan the data the moment a label is edited in Settings.
    nannyBadges.current = ['cpr']
    reset({ users: [approvedNanny()], items: [approvedNanny()] })

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /badges/i }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /First Aid/i }))
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }))

    expect(saveVerifiedBadges).toHaveBeenCalledWith(['cpr', 'first_aid'])
  })

  it('removes a badge when it is unchecked', async () => {
    nannyBadges.current = ['cpr', 'first_aid']
    reset({ users: [approvedNanny()], items: [approvedNanny()] })

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /badges/i }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /CPR Certified/i }))
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }))

    expect(saveVerifiedBadges).toHaveBeenCalledWith(['first_aid'])
  })

  it('offers no badge editor for families — verified badges are a nanny concept', async () => {
    const fam = approvedNanny({ uid: 'fam-1', role: 'family', fullName: 'The Chens' })
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await openActiveTab()

    expect(screen.queryByRole('button', { name: /badges/i })).not.toBeInTheDocument()
  })
})

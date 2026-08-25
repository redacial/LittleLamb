import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPeoplePage } from './AdminPeoplePage'
import { SELF_BADGES, VERIFIED_BADGES } from '../../lib/badges'
import type { Review, UserDoc } from '../../types'

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

// Shared across renders so the approve/reject/reinstate suites can assert on the exact
// call. The previous inline `vi.fn()`s were unreachable from the tests, which is part of
// why nothing ever pinned the destructive Reject click.
const adminActions = {
  approve: vi.fn(async () => {}),
  reject: vi.fn(async () => {}),
  reinstate: vi.fn(async () => {}),
  advanceStage: vi.fn(async () => {}),
}

const reviewsResult = {
  items: [] as Review[],
  error: null as Error | null,
  truncated: false,
  hasMore: false,
  loading: false,
  loadingMore: false,
  loadMore: vi.fn(),
}

vi.mock('../../hooks/useReviews', () => ({
  useReviews: () => reviewsResult,
  useSubmitReview: () => vi.fn(),
}))

vi.mock('../../hooks/useAdmin', () => ({
  useUsersByRole: () => hookResult,
  useAdminActions: () => adminActions,
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
  for (const fn of Object.values(adminActions)) fn.mockClear()
  Object.assign(reviewsResult, {
    items: [],
    error: null,
    truncated: false,
    hasMore: false,
    loading: false,
    loadingMore: false,
  })
})

function review(over: Partial<Review> = {}): Review {
  return {
    id: 'rev_1',
    bookingId: 'bk_20260410',
    authorId: 'fam_1',
    authorRole: 'family',
    subjectId: 'nanny-1',
    rating: 5,
    comment: 'Maria was wonderful with the twins.',
    createdAt: null,
    ...over,
  } as Review
}

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


// Reviews were a WRITE-ONLY collection. useSubmitReview wrote to `reviews` from three
// surfaces and NOTHING in the codebase ever read it back — so families and nannies were
// asked to write feedback that no human being could open, while CLAUDE.md says reviews
// exist precisely to give Lucy and David ground-level insight into match quality.
// This suite pins the admin reader end of that round trip.
describe('AdminPeoplePage — reading the reviews left about someone', () => {
  it('opens a reviews panel for a person', async () => {
    reset({ users: [approvedNanny()], items: [approvedNanny()] })
    reviewsResult.items = [review()]

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /reviews/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('shows the rating, the comment, and which booking it refers to', async () => {
    reset({ users: [approvedNanny()], items: [approvedNanny()] })
    reviewsResult.items = [review()]

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /reviews/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Maria was wonderful with the twins/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/5\s*\/\s*5/)).toBeInTheDocument()
    // The booking is what makes a review actionable — "which visit was this?"
    expect(within(dialog).getByText(/bk_20260410/)).toBeInTheDocument()
  })

  it('says who wrote it, by role — a family reviewing a nanny is not the same signal', async () => {
    reset({ users: [approvedNanny()], items: [approvedNanny()] })
    reviewsResult.items = [review({ authorRole: 'family' })]

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /reviews/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/from the family/i)).toBeInTheDocument()
  })

  it('renders a review with no comment — a bare rating is still signal', async () => {
    reset({ users: [approvedNanny()], items: [approvedNanny()] })
    reviewsResult.items = [review({ comment: '' })]

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /reviews/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/2\s*\/\s*5|5\s*\/\s*5/)).toBeInTheDocument()
    expect(within(dialog).getByText(/no comment/i)).toBeInTheDocument()
  })

  it('shows a load error, NOT "no reviews yet", when the read fails', async () => {
    // The D50 failure again: a permission error renders identically to "nobody has left
    // feedback", and an admin would draw exactly the wrong conclusion about match quality.
    reset({ users: [approvedNanny()], items: [approvedNanny()] })
    reviewsResult.error = new Error('permission-denied')

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /reviews/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByText(/no reviews yet/i)).not.toBeInTheDocument()
    expect(within(dialog).getByText(/loading problem, not an empty list/i)).toBeInTheDocument()
  })

  it('still says there are none when the read SUCCEEDS and returns nothing', async () => {
    reset({ users: [approvedNanny()], items: [approvedNanny()] })

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()
    await userEvent.click(screen.getByRole('button', { name: /reviews/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/no reviews yet/i)).toBeInTheDocument()
  })

  it('offers the reviews panel for families too — reviews run both ways', async () => {
    const fam = approvedNanny({ uid: 'fam-1', role: 'family', fullName: 'The Chens' })
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await openActiveTab()

    expect(screen.getByRole('button', { name: /reviews/i })).toBeInTheDocument()
  })
})


// Rejection is the one irreversible click on this page. Approve and Reject were adjacent
// `size="sm"` buttons with no confirmation anywhere in the app, and both disappeared the
// instant Reject was clicked — the row moved to the `rejected` tab where nothing could undo
// it. One misclick permanently killed a real family's account, and because platform email
// is not live (Resend DNS), the wrongly-rejected family would never be told: they'd sit on
// the holding page refreshing forever. These tests pin BOTH halves of the fix — the guard
// in front of the destructive click, and the way back out of it.
describe('AdminPeoplePage — confirming a rejection', () => {
  function pendingFamily(over: Partial<UserDoc> = {}): UserDoc {
    return {
      uid: 'fam-9',
      fullName: 'The Alvarez Family',
      email: 'alvarez@example.com',
      role: 'family',
      approved: false,
      status: 'pending',
      ...over,
    } as UserDoc
  }

  it('does NOT reject on the first click — it asks first', async () => {
    const fam = pendingFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    // The whole point: the write must not have happened yet.
    expect(adminActions.reject).not.toHaveBeenCalled()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('names the person in the dialog — a confirm that omits WHO is useless against a misclick', async () => {
    const fam = pendingFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    const dialog = await screen.findByRole('dialog')
    // Named at least once (heading and body both carry it) — the requirement is that the
    // admin cannot possibly confirm without seeing WHOSE application they are killing.
    expect(within(dialog).getAllByText(/The Alvarez Family/).length).toBeGreaterThan(0)
  })

  it('warns that the applicant will NOT be told, because platform email is not live', async () => {
    const fam = pendingFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/won’t be notified|will not be notified/i)).toBeInTheDocument()
  })

  it('rejects nobody when the dialog is dismissed', async () => {
    const fam = pendingFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /keep application|never mind|cancel/i }))

    expect(adminActions.reject).not.toHaveBeenCalled()
  })

  it('rejects the right person once confirmed', async () => {
    const fam = pendingFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await userEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /reject application/i }))

    expect(adminActions.reject).toHaveBeenCalledWith('fam-9', 'The Alvarez Family', 'family')
  })

  it('leaves Approve unguarded — only the destructive click earns friction', async () => {
    // Deliberate asymmetry. Approving by mistake is recoverable in seconds; rejecting is not.
    const fam = pendingFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await userEvent.click(screen.getByRole('button', { name: /^approve$/i }))

    expect(adminActions.approve).toHaveBeenCalledWith('fam-9', 'The Alvarez Family', 'family')
  })
})


describe('AdminPeoplePage — undoing a rejection', () => {
  function rejectedFamily(over: Partial<UserDoc> = {}): UserDoc {
    return {
      uid: 'fam-9',
      fullName: 'The Alvarez Family',
      email: 'alvarez@example.com',
      role: 'family',
      approved: false,
      status: 'rejected',
      ...over,
    } as UserDoc
  }

  async function openRejectedTab() {
    await userEvent.click(screen.getByRole('tab', { name: /^rejected$/i }))
  }

  it('offers a way back for someone on the rejected tab', async () => {
    const fam = rejectedFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await openRejectedTab()

    expect(screen.getByRole('button', { name: /reinstate/i })).toBeInTheDocument()
  })

  it('moves them back to pending — NOT straight to approved', async () => {
    // Reinstating must undo the mistake, not commit the opposite one. Back to pending is
    // the exact state they were in a moment before the misclick; approving is a separate,
    // deliberate click that fires a real "you're in" email.
    const fam = rejectedFamily()
    reset({ users: [fam], items: [fam] })

    render(<AdminPeoplePage role="family" />)
    await openRejectedTab()
    await userEvent.click(screen.getByRole('button', { name: /reinstate/i }))

    expect(adminActions.reinstate).toHaveBeenCalledWith('fam-9')
    expect(adminActions.approve).not.toHaveBeenCalled()
  })

  it('does not offer Reinstate to people who were never rejected', async () => {
    const active = approvedNanny()
    reset({ users: [active], items: [active] })

    render(<AdminPeoplePage role="nanny" />)
    await openActiveTab()

    expect(screen.queryByRole('button', { name: /reinstate/i })).not.toBeInTheDocument()
  })
})

// The application answers now persist (ba8976c), but the row still showed only a name, an
// email and a stage — not even the phone, which was always stored. Lucy was approving families
// with none of the content she is meant to be reviewing, which is what "we personally review
// every family" is supposed to mean.
//
// Everything here is OPTIONAL: pre-existing accounts have none of it, and a RETURNING Google
// user keeps their old doc, so the row must degrade rather than render "undefined".
describe('AdminPeoplePage — the application is visible to the person approving it', () => {
  function applicant(over: Partial<UserDoc> = {}): UserDoc {
    return {
      uid: 'fam-1',
      fullName: 'The Ortegas',
      email: 'ortega@example.com',
      role: 'family',
      approved: false,
      status: 'pending',
      ...over,
    } as UserDoc
  }

  function showFamily(u: UserDoc) {
    reset({ users: [u], items: [u] })
    render(<AdminPeoplePage role="family" />)
  }

  it('shows a family\u2019s neighbourhood, children and notes', () => {
    showFamily(
      applicant({
        phone: '805-555-0142',
        neighborhood: 'The Mesa',
        children: 'Olive (4), Theo (7)',
        notes: 'Theo has a mild peanut allergy',
      } as Partial<UserDoc>),
    )
    expect(screen.getByText(/The Mesa/)).toBeInTheDocument()
    expect(screen.getByText(/Olive \(4\), Theo \(7\)/)).toBeInTheDocument()
    expect(screen.getByText(/peanut allergy/)).toBeInTheDocument()
  })

  it('shows the phone number, which was persisted all along but never rendered', () => {
    showFamily(applicant({ phone: '805-555-0142' }))
    expect(screen.getByText(/805-555-0142/)).toBeInTheDocument()
  })

  it('shows a nanny\u2019s experience and personal statement', () => {
    const n = applicant({
      uid: 'nanny-9',
      role: 'nanny',
      fullName: 'Priya Raman',
      yearsExperience: '5+',
      personalStatement: 'I have cared for infants since 2019.',
    } as Partial<UserDoc>)
    reset({ users: [n], items: [n] })
    render(<AdminPeoplePage role="nanny" />)
    expect(screen.getByText(/5\+/)).toBeInTheDocument()
    expect(screen.getByText(/infants since 2019/)).toBeInTheDocument()
  })

  // The degradation case. A returning Google user has none of these fields.
  it('renders cleanly when the applicant has no application fields at all', () => {
    showFamily(applicant())
    expect(screen.getByText('The Ortegas')).toBeInTheDocument()
    expect(screen.queryByText(/undefined|null/i)).not.toBeInTheDocument()
  })
})

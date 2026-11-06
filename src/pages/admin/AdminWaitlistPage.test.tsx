import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminWaitlistPage } from './AdminWaitlistPage'
import type { WaitlistEntry } from '../../hooks/useAdmin'
import type { GrowingList } from '../../hooks/useGrowingCollection'

// The Waitlist page is Lucy & David's view of who's raised their hand from the website. It must:
//  - show the actual people and their emails (so they can reach out),
//  - distinguish waitlist signups from contact messages via the tabs,
//  - and — like every admin list — show a DISTINCT error state, never render a load failure as
//    an empty "nobody's interested" state (the trap documented across the admin hooks).

const state: { current: GrowingList<WaitlistEntry> } = {
  current: {
    items: [],
    error: null,
    truncated: false,
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
  },
}

vi.mock('../../hooks/useAdmin', async (orig) => {
  const actual = await orig<typeof import('../../hooks/useAdmin')>()
  return { ...actual, useWaitlist: () => state.current }
})

function set(partial: Partial<GrowingList<WaitlistEntry>>) {
  state.current = { ...state.current, ...partial }
}

const entry = (over: Partial<WaitlistEntry>): WaitlistEntry => ({
  id: Math.random().toString(36),
  kind: 'waitlist',
  role: 'family',
  name: 'Sam Parent',
  email: 'sam@example.com',
  ...over,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminWaitlistPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  set({ items: [], error: null, truncated: false, loading: false })
})

describe('AdminWaitlistPage', () => {
  it('lists each interested person with a clickable email', () => {
    set({ items: [entry({ name: 'Sam Parent', email: 'sam@example.com' })] })
    renderPage()
    expect(screen.getByText('Sam Parent')).toBeInTheDocument()
    const mail = screen.getByRole('link', { name: 'sam@example.com' })
    expect(mail).toHaveAttribute('href', 'mailto:sam@example.com')
  })

  it('filters to contact messages when the Messages tab is chosen', async () => {
    set({
      items: [
        entry({ name: 'Waitlister', kind: 'waitlist' }),
        entry({ name: 'Messenger', kind: 'contact', message: 'Do you cover Goleta?' }),
      ],
    })
    renderPage()
    // Both visible under "All".
    expect(screen.getByText('Waitlister')).toBeInTheDocument()
    expect(screen.getByText('Messenger')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Messages' }))

    expect(screen.getByText('Messenger')).toBeInTheDocument()
    expect(screen.queryByText('Waitlister')).not.toBeInTheDocument()
  })

  it('shows a DISTINCT error state on load failure — never an empty state', () => {
    set({ error: new Error('permission-denied'), items: [] })
    renderPage()
    // The empty-state copy must NOT appear when the read actually failed.
    expect(screen.queryByText(/No one on the waitlist yet/)).not.toBeInTheDocument()
    // LoadErrorNotice renders its own message naming what failed.
    expect(screen.getByText(/couldn.t load|couldn't load|the waitlist/i)).toBeInTheDocument()
  })

  it('shows an empty state when there genuinely is no one', () => {
    set({ items: [], error: null })
    renderPage()
    expect(screen.getByText(/No one on the waitlist yet/)).toBeInTheDocument()
  })

  it('renders a nanny signup’s role so admins can tell families and nannies apart', () => {
    set({ items: [entry({ name: 'Nanny Nia', role: 'nanny' })] })
    renderPage()
    const row = screen.getByText('Nanny Nia').closest('div')!
    expect(within(row.parentElement as HTMLElement).getByText('nanny')).toBeInTheDocument()
  })
})

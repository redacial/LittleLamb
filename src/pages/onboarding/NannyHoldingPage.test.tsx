import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NannyHoldingPage } from './NannyHoldingPage'
import type { NannyStage } from '../../types'

// The single most important moment in the nanny funnel: admin advances her to
// "Interview scheduled" and her only call-to-action is the Calendly link. That URL was
// HARDCODED to https://calendly.com/littlelamb/interview, which 404s — so the CTA was a
// dead link in production, and a second hardcoded copy sat in AdminSettingsPage where the
// two could silently drift.
//
// The behaviour these tests pin: with no URL configured the button is HIDDEN, not rendered
// pointing at nothing. A broken CTA is worse than no CTA — the nanny clicks, hits a 404,
// and concludes Little Lamb is broken. Same principle as the fabricated-social-proof fix.

const calendly = { url: '' }

vi.mock('../../hooks/useAdmin', () => ({
  useCalendlyConfig: () => ({ config: { url: calendly.url }, loading: false, save: vi.fn() }),
}))

const auth = { stage: 'interview_scheduled' as NannyStage }

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { fullName: 'Maria Reyes', stage: auth.stage },
    user: { uid: 'n1' },
  }),
}))

beforeEach(() => {
  calendly.url = ''
  auth.stage = 'interview_scheduled'
})

function renderPage() {
  return render(
    <MemoryRouter>
      <NannyHoldingPage />
    </MemoryRouter>,
  )
}

const bookButton = () => screen.queryByRole('button', { name: /book your interview/i })

describe('NannyHoldingPage — the Calendly CTA', () => {
  it('hides the interview button entirely when no Calendly link is configured', () => {
    calendly.url = ''

    renderPage()

    expect(bookButton()).not.toBeInTheDocument()
  })

  it('never renders a link with an empty or placeholder href when unconfigured', () => {
    // Belt and braces: the button could be hidden while an empty <a> wrapper survives,
    // which is still a dead click target.
    calendly.url = ''

    const { container } = renderPage()

    for (const a of container.querySelectorAll('a')) {
      expect(a.getAttribute('href')).toBeTruthy()
      expect(a.getAttribute('href')).not.toMatch(/calendly/i)
    }
  })

  it('treats a whitespace-only configured link as unconfigured', () => {
    calendly.url = '   '

    renderPage()

    expect(bookButton()).not.toBeInTheDocument()
  })

  it('shows the button pointing at the configured link once admin sets one', () => {
    calendly.url = 'https://calendly.com/lucy-littlelamb/30min'

    renderPage()

    const btn = bookButton()
    expect(btn).toBeInTheDocument()
    expect(btn?.closest('a')).toHaveAttribute('href', 'https://calendly.com/lucy-littlelamb/30min')
  })

  it('does not show the interview CTA before the interview stage, even when configured', () => {
    calendly.url = 'https://calendly.com/lucy-littlelamb/30min'
    auth.stage = 'under_review'

    renderPage()

    expect(bookButton()).not.toBeInTheDocument()
  })
})

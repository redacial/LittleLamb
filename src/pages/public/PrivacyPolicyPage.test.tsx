import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPolicyPage } from './PrivacyPolicyPage'
import { PRIVACY_SECTIONS, PRIVACY_EFFECTIVE, privacyParagraphs } from '../../lib/privacy'

// The privacy policy is the page a parent reads BEFORE entering their home address and their
// children's details. Two things must hold: every section actually renders (a silently dropped
// section is a trust/compliance gap), and the copy renders as inert text (it describes data
// practices — it must never become an injection surface even though the content is ours today).

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPolicyPage />
    </MemoryRouter>,
  )
}

describe('PrivacyPolicyPage', () => {
  it('renders every section heading', () => {
    renderPage()
    for (const section of PRIVACY_SECTIONS) {
      expect(screen.getByRole('heading', { name: section.heading })).toBeInTheDocument()
    }
  })

  it('shows the effective date', () => {
    renderPage()
    expect(screen.getByText(new RegExp(PRIVACY_EFFECTIVE))).toBeInTheDocument()
  })

  it('names the actual third parties data is shared with (accuracy, not boilerplate)', () => {
    renderPage()
    // These must stay in step with the real integrations; a generic policy that omits them
    // would be inaccurate for a platform that genuinely hands data to each.
    // Each may legitimately appear in more than one section (e.g. Firebase under both
    // "who can see it" and "how we protect it"), so assert at-least-one rather than exactly-one.
    expect(screen.getAllByText(/Stripe/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Firebase/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Resend/).length).toBeGreaterThan(0)
  })

  it('renders body copy as inert text, not HTML', () => {
    const { container } = renderPage()
    // Nothing in the policy body should produce executable/markup nodes.
    expect(container.querySelector('script')).toBeNull()
  })
})

describe('privacyParagraphs', () => {
  it('splits on newlines and drops blank lines', () => {
    expect(privacyParagraphs('One.\n\n  Two.  \n')).toEqual(['One.', 'Two.'])
  })

  it('returns an empty list for empty input', () => {
    expect(privacyParagraphs('')).toEqual([])
  })
})

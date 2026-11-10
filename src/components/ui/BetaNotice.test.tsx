import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// The beta notice must appear ONLY in a no-email build (VITE_BETA_NO_EMAIL === 'true') and be
// invisible otherwise, so call sites can mount it unconditionally and it simply vanishes once
// email goes live. betaNoEmail is read at module load, so each case re-imports after stubbing.

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function load() {
  return import('./BetaNotice')
}

describe('BetaNotice', () => {
  it('renders nothing when VITE_BETA_NO_EMAIL is not "true"', async () => {
    vi.stubEnv('VITE_BETA_NO_EMAIL', undefined as never)
    const { BetaNotice } = await load()
    const { container } = render(<BetaNotice context="signup" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a signup-specific notice in a no-email build', async () => {
    vi.stubEnv('VITE_BETA_NO_EMAIL', 'true')
    const { BetaNotice } = await load()
    render(<BetaNotice context="signup" />)
    expect(screen.getByText(/early beta/i)).toBeInTheDocument()
    expect(screen.getByText(/won.t receive confirmation emails/i)).toBeInTheDocument()
  })

  it('shows a holding-specific notice that reassures the page self-updates', async () => {
    vi.stubEnv('VITE_BETA_NO_EMAIL', 'true')
    const { BetaNotice } = await load()
    render(<BetaNotice context="holding" />)
    expect(screen.getByText(/updates on its own the moment you.re approved/i)).toBeInTheDocument()
  })

  it('betaNoEmail is false for any value other than the literal "true"', async () => {
    vi.stubEnv('VITE_BETA_NO_EMAIL', 'yes')
    const { betaNoEmail } = await load()
    expect(betaNoEmail).toBe(false)
  })
})

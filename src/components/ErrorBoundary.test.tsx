import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

// The boundary logs to console.error by design; silence it so a passing run stays readable.
const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {})
afterEach(() => {
  vi.restoreAllMocks()
})

function Boom({ explode }: { explode: boolean }): React.ReactElement {
  if (explode) throw new Error('kaboom')
  return <p>all good</p>
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('renders the recovery screen instead of unmounting when a child throws', () => {
    quiet()
    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    )
    // The whole point: the user sees a real screen, not a blank page.
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('"Try again" re-renders the tree, recovering once the cause is gone', async () => {
    quiet()
    // Mirrors the real recovery case: a transient failure (bad data, slow doc) that is
    // resolved by the time the user retries.
    function Harness() {
      const [explode, setExplode] = useState(true)
      return (
        <>
          <button onClick={() => setExplode(false)}>fix it</button>
          <ErrorBoundary>
            <Boom explode={explode} />
          </ErrorBoundary>
        </>
      )
    }
    render(<Harness />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /fix it/i }))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.getByText('all good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('logs the failure with its boundary name for triage', () => {
    const spy = quiet()
    render(
      <ErrorBoundary boundaryName="routes">
        <Boom explode />
      </ErrorBoundary>,
    )
    expect(spy.mock.calls.some((c) => String(c[0]).includes('[ErrorBoundary:routes]'))).toBe(true)
  })
})

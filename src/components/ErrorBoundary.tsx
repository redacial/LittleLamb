// Catches render-time errors anywhere below it so a single bad component can never
// white-screen the whole app. React only exposes this via a class component — there is
// no hook equivalent for componentDidCatch.
//
// Why this matters here: a parent mid-booking who hits a blank page has no way to tell
// whether their booking went through. A calm, branded recovery screen is the difference
// between "something glitched, try again" and "this platform lost my childcare booking".
//
// Note this catches RENDER errors only. Errors inside event handlers and async work
// (our Firebase calls) are already handled at the hook/call-site level.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
  /** Optional label so logs identify which part of the tree failed. */
  boundaryName?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console is the only sink today — no error-reporting service is wired up yet.
    // When one is added (Sentry et al.), this is the single place to report from.
    const label = this.props.boundaryName ? `:${this.props.boundaryName}` : ''
    console.error(`[ErrorBoundary${label}]`, error, info.componentStack)
  }

  private reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div role="alert" className="min-h-screen bg-ll-cream flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-ll-card border-1.5 border-ll-sage-light bg-ll-cream-dark p-8 text-center">
          <h1 className="font-display text-display-md text-ll-ink">Something went wrong</h1>
          <p className="mt-3 text-ll-warm-gray">
            Sorry — this page ran into a problem. Nothing you&rsquo;ve already saved is
            affected. Try again, and if it keeps happening please let us know.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" onClick={this.reset}>
              Try again
            </Button>
            <Button type="button" variant="ghost" onClick={() => window.location.assign('/')}>
              Go home
            </Button>
          </div>

          <p className="mt-6 font-mono text-mono-sm text-ll-warm-gray">
            hello@littlelambnannies.com
          </p>
        </div>
      </div>
    )
  }
}

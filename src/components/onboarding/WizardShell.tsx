import { Logo } from '../ui'
import { cn } from '../../lib/cn'

interface WizardShellProps {
  steps: string[]
  current: number // 0-based
  children: React.ReactNode
  /** Voluntary mode = pending user getting a head start; shows a "save & finish later" tone. */
  voluntary?: boolean
}

/**
 * Onboarding wizard chrome: a thin progress rail (steps cannot be skipped) over a centered
 * content column. The rail doubles as the "you are here" signal the spec requires.
 */
export function WizardShell({ steps, current, children, voluntary }: WizardShellProps) {
  return (
    <div className="min-h-screen bg-ll-cream">
      <header className="border-b border-ll-ink/10 bg-ll-cream/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <span className="font-mono text-sm text-ll-warm-gray">
            Step {current + 1} of {steps.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
        {/* Progress rail */}
        <ol className="mb-8 flex items-center gap-2" aria-label="Setup progress">
          {steps.map((label, i) => {
            const done = i < current
            const active = i === current
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold border-1.5',
                    done && 'bg-ll-sage-mid text-white border-ll-sage-mid',
                    active && 'bg-white text-ll-sage-deep border-ll-sage',
                    !done && !active && 'bg-ll-cream-dark text-ll-warm-gray border-ll-ink/10',
                  )}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 8.5l3.5 3.5L13 4" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {i < steps.length - 1 && (
                  <span className={cn('h-px flex-1', done ? 'bg-ll-sage' : 'bg-ll-ink/10')} />
                )}
              </li>
            )
          })}
        </ol>

        <p className="eyebrow mb-1">{voluntary ? 'Get a head start' : 'Welcome to Little Lamb'}</p>
        {children}
      </div>
    </div>
  )
}

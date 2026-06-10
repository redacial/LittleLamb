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
    <div className="min-h-screen bg-cream">
      <header className="border-b border-charcoal/10 bg-cream/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <span className="text-sm text-charcoal-muted">
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
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ring-1',
                    done && 'bg-sage-500 text-white ring-sage-500',
                    active && 'bg-white text-sage-700 ring-sage-500',
                    !done && !active && 'bg-cream-200 text-charcoal-faint ring-charcoal/10',
                  )}
                >
                  {done ? '✓' : i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span className={cn('h-px flex-1', done ? 'bg-sage-400' : 'bg-charcoal/10')} />
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

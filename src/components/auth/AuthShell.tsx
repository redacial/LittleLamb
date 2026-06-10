import { Link } from 'react-router-dom'
import { Logo } from '../ui'

/**
 * Two-panel auth layout. Left: the form. Right (desktop): an editorial trust panel — the
 * "characteristic thing" in this subject's world is the promise that every nanny is vetted.
 * That promise, set in the display serif, is the signature here rather than a stock hero image.
 */
export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/" className="inline-flex w-fit rounded-full">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </div>
        {footer && <div className="mx-auto w-full max-w-sm text-sm text-charcoal-muted">{footer}</div>}
      </div>

      <aside className="relative hidden overflow-hidden bg-sage-600 lg:block">
        <div className="absolute inset-0 opacity-[0.12]" aria-hidden>
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-cream" />
          <div className="absolute -left-10 bottom-0 h-80 w-80 rounded-full bg-terracotta-300" />
        </div>
        <div className="relative flex h-full flex-col justify-between p-12 text-cream">
          <p className="eyebrow text-cream/70">Santa Barbara childcare</p>
          <div>
            <p className="font-display text-display-md leading-tight text-cream">
              Every nanny here has passed a background check and a personal interview before their
              profile ever goes live.
            </p>
            <p className="mt-6 max-w-prose text-cream/80">
              Little Lamb is a small, local network — the kind of nanny you'd find through a friend,
              with the calendar and trust built in.
            </p>
          </div>
          <p className="text-sm text-cream/60">Founded at Westmont College · littlelambnannies.com</p>
        </div>
      </aside>
    </div>
  )
}

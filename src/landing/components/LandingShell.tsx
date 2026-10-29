import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '../../components/ui/Logo'
import { useButtonHover } from '../../lib/motion'
import { useWaitlist } from './waitlistContext'

/**
 * Chrome for the pre-launch landing site. Unlike the app's PublicShell there is NO login
 * and NO path into the (unfinished) app — every action routes to the waitlist/contact modal.
 * Nav links are in-page anchors, not routes, since the landing site is a single page.
 */
export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ll-paper">
      {/* Skip link — first focusable element, visible only on keyboard focus (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ll-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ll-cream"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">{children}</main>
      <LandingFooter />
    </div>
  )
}

const NAV_LINKS = [
  { label: 'Last-minute care', href: '#care' },
  { label: 'How we vet', href: '#trust' },
  { label: 'For nannies', href: '#nannies' },
]

function LandingNav() {
  const { openWaitlist } = useWaitlist()
  const btnHover = useButtonHover()
  return (
    <header className="sticky top-0 z-30 border-b-1.5 border-ll-cream-dark/70 bg-ll-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <a href="#top" aria-label="Little Lamb Nannies home" className="rounded-full">
          {/* The full lamb + wordmark doesn't fit beside the button on a phone. */}
          <Logo size="sm" mark={false} className="sm:hidden" />
          <Logo size="md" className="hidden sm:inline-flex" />
        </a>
        <div className="flex items-center gap-5">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden text-[0.95rem] font-medium text-ll-warm-gray hover:text-ll-ink lg:inline"
            >
              {l.label}
            </a>
          ))}
          <motion.div {...btnHover} className="inline-block">
            <button
              type="button"
              onClick={() => openWaitlist()}
              className="inline-flex h-10 items-center rounded-full bg-ll-brand-terra-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ll-ink sm:px-5"
            >
              Join the waitlist
            </button>
          </motion.div>
        </div>
      </nav>
    </header>
  )
}

function LandingFooter() {
  const { openWaitlist, openContact } = useWaitlist()
  return (
    <footer className="bg-ll-brand-sage text-ll-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-8">
        <div>
          <Logo size="lg" tone="white" />
          <p className="mt-4 max-w-xs text-[0.95rem] leading-relaxed text-ll-ink">
            Trusted nannies for Santa Barbara families, for last-minute help and for the everyday.
            Started at Westmont College.
          </p>
        </div>
        <FooterCol
          title="Families"
          items={[
            { label: 'Last-minute care', href: '#care' },
            { label: 'How we vet nannies', href: '#trust' },
            { label: 'Join the waitlist', onClick: () => openWaitlist({ role: 'family' }) },
          ]}
        />
        <FooterCol
          title="Nannies"
          items={[
            { label: 'Why join', href: '#nannies' },
            { label: 'Join the waitlist', onClick: () => openWaitlist({ role: 'nanny' }) },
          ]}
        />
      </div>
      <div className="border-t-1.5 border-ll-ink/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-sm text-ll-ink">littlelambnannies.com · Santa Barbara, CA</p>
          <button
            type="button"
            onClick={() => openContact()}
            className="w-fit text-left text-sm font-medium text-ll-ink underline underline-offset-4 hover:no-underline"
          >
            Get in touch
          </button>
        </div>
      </div>
    </footer>
  )
}

type FooterItem = { label: string; href?: string; onClick?: () => void }

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <p className="mb-3 font-display text-2xl leading-none text-ll-ink">{title}</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.label}>
            {it.href ? (
              <a href={it.href} className="text-[0.95rem] text-ll-ink hover:underline">
                {it.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={it.onClick}
                className="text-left text-[0.95rem] text-ll-ink hover:underline"
              >
                {it.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

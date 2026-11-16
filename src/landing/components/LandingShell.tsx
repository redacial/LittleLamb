import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '../../components/ui/Logo'
import { useButtonHover } from '../../lib/motion'
import { useWaitlist } from './waitlistContext'

/**
 * Chrome for the pre-launch landing site. Deliberately mirrors the app's PublicShell visual
 * language — cream background, blurred cream nav, the sage logo, a terracotta pill CTA and an
 * eyebrow-titled footer — so the public site and the (unfinished) app read as one product.
 * The difference from PublicShell is behavioural, not visual: there is NO login and NO path
 * into the app, so every action opens the waitlist/contact modal and nav links are in-page
 * anchors, since the landing site is a single page.
 */
export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ll-cream">
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
    <header className="sticky top-0 z-30 border-b-1.5 border-ll-cream-dark bg-ll-cream/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
        <a href="#top" aria-label="Little Lamb Nannies home" className="rounded-full">
          <Logo />
        </a>
        <div className="flex items-center gap-4 sm:gap-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden text-label font-medium text-ll-warm-gray hover:text-ll-ink lg:inline"
            >
              {l.label}
            </a>
          ))}
          <motion.div {...btnHover} className="inline-block">
            <button
              type="button"
              onClick={() => openWaitlist()}
              className="inline-flex h-10 items-center rounded-full bg-ll-terra-deep px-5 text-label font-medium text-white transition-colors hover:bg-ll-ink"
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
    <footer className="border-t-1.5 border-ll-cream-dark bg-ll-cream-dark/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ll-warm-gray">
            Trusted nannies for Santa Barbara families, for last-minute help and for the everyday.
            Founded at Westmont College.
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
      <div className="border-t-1.5 border-ll-cream-dark">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 font-mono text-mono-sm text-ll-warm-gray sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>littlelambnannies.com · Santa Barbara, CA</p>
          <button
            type="button"
            onClick={() => openContact()}
            className="w-fit text-left font-medium text-ll-warm-gray underline underline-offset-4 hover:text-ll-ink hover:no-underline"
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
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.label}>
            {it.href ? (
              <a href={it.href} className="text-sm text-ll-warm-gray hover:text-ll-ink">
                {it.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={it.onClick}
                className="text-left text-sm text-ll-warm-gray hover:text-ll-ink"
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

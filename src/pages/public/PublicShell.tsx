import { Link } from 'react-router-dom'
import { Logo } from '../../components/ui'

/**
 * Shared chrome for every public (signed-out) page: top nav with the family CTA + the
 * secondary "For Nannies" path, and the footer. The nav keeps families primary and nannies
 * a visible-but-secondary path, exactly as the flow docs specify.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ll-cream">
      <PublicNav />
      <main>{children}</main>
      <PublicFooter />
    </div>
  )
}

export function PublicNav() {
  return (
    <header className="sticky top-0 z-30 border-b-1.5 border-ll-cream-dark bg-ll-cream/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link to="/" aria-label="Little Lamb Nannies home">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/for-nannies"
            className="hidden text-label font-medium text-ll-warm-gray hover:text-ll-ink sm:inline"
          >
            For nannies
          </Link>
          <Link
            to="/login"
            className="text-label font-medium text-ll-warm-gray hover:text-ll-ink"
          >
            Log in
          </Link>
          <Link
            to="/apply"
            className="inline-flex h-10 items-center rounded-full bg-ll-terra px-5 text-label font-medium text-white transition-colors hover:bg-ll-terra-deep"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="border-t-1.5 border-ll-cream-dark bg-ll-cream-dark/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ll-warm-gray">
            Trusted, pre-screened nannies for Santa Barbara families. Founded at Westmont College.
          </p>
        </div>
        <FooterCol
          title="Families"
          links={[
            { to: '/for-families', label: 'How it works' },
            { to: '/apply', label: 'Get started' },
            { to: '/login', label: 'Log in' },
          ]}
        />
        <FooterCol
          title="Nannies"
          links={[
            { to: '/for-nannies', label: 'Why join' },
            { to: '/apply?role=nanny', label: 'Apply now' },
            { to: '/login', label: 'Log in' },
          ]}
        />
      </div>
      <div className="border-t-1.5 border-ll-cream-dark">
        <p className="mx-auto max-w-6xl px-5 py-5 font-mono text-mono-sm text-ll-warm-gray sm:px-8">
          littlelambnannies.com · Santa Barbara, CA
        </p>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="text-sm text-ll-warm-gray hover:text-ll-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

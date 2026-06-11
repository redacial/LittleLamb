import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import { springGentle } from '../../lib/motion'
import { navFor } from './nav'
import { Icon } from './Icon'
import { Logo, Avatar } from '../ui'
import { cn } from '../../lib/cn'

/**
 * Persistent role-aware app shell. Sidebar on desktop, slide-in drawer on mobile. The same
 * component serves family, nanny, and admin — the nav set is the only difference, keeping the
 * three experiences visually consistent (a deliberate trust signal, not three different apps).
 */
export function AppLayout() {
  const { profile } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const prefersReduced = useReducedMotion()
  if (!profile) return null
  const items = navFor(profile.role)

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <div className="flex items-center gap-3 px-5 pb-4">
        <Avatar name={profile.fullName} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ll-ink">{profile.fullName}</p>
          <p className="text-xs capitalize text-ll-warm-gray">{profile.role}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setDrawer(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-ll-input px-3 py-2.5 text-label font-medium transition-colors',
                isActive
                  ? 'bg-ll-sage-light text-ll-sage-deep'
                  : 'text-ll-warm-gray hover:bg-ll-cream-dark hover:text-ll-ink',
              )
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t-1.5 border-ll-cream-dark p-3">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-ll-input px-3 py-2.5 text-label font-medium text-ll-warm-gray hover:bg-ll-cream-dark hover:text-ll-ink"
        >
          <Icon name="settings" />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ll-cream lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Skip link — first focusable element, visible only on keyboard focus (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ll-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ll-cream"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r-1.5 border-ll-cream-dark bg-ll-cream lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b-1.5 border-ll-cream-dark bg-ll-cream px-4 py-3 lg:hidden">
        <Logo withSubline={false} />
        <button
          aria-label="Open menu"
          onClick={() => setDrawer(true)}
          className="rounded-ll-tag p-2 text-ll-ink hover:bg-ll-cream-dark"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              className="absolute inset-0 bg-ll-ink/40"
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              className="absolute left-0 top-0 h-full w-72 bg-ll-cream shadow-lift"
              initial={prefersReduced ? { opacity: 0 } : { x: '-100%' }}
              animate={prefersReduced ? { opacity: 1 } : { x: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { x: '-100%' }}
              transition={prefersReduced ? { duration: 0.15 } : springGentle}
            >
              {sidebar}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main id="main" className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

/** Standard page header used inside the layout's main column. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b-1.5 border-ll-cream-dark px-6 py-6 sm:px-8">
      <div>
        <h1 className="text-display-lg leading-none">{title}</h1>
        {subtitle && <p className="mt-1 text-ll-warm-gray">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-6 sm:px-8">{children}</div>
}

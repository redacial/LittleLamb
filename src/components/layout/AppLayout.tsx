import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
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
          <p className="truncate text-sm font-bold">{profile.fullName}</p>
          <p className="text-xs capitalize text-charcoal-faint">{profile.role}</p>
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
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-sage-100 text-sage-700'
                  : 'text-charcoal-muted hover:bg-cream-200 hover:text-charcoal',
              )
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-charcoal/10 p-3">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal-muted hover:bg-cream-200 hover:text-charcoal"
        >
          <Icon name="settings" />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r border-charcoal/10 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-charcoal/10 bg-white px-4 py-3 lg:hidden">
        <Logo withSubline={false} />
        <button
          aria-label="Open menu"
          onClick={() => setDrawer(true)}
          className="rounded-lg p-2 text-charcoal hover:bg-cream-200"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-charcoal/40" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-lift">{sidebar}</div>
        </div>
      )}

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

/** Standard page header used inside the layout's main column. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 px-6 py-6 sm:px-8">
      <div>
        <h1 className="text-display-md">{title}</h1>
        {subtitle && <p className="mt-1 text-charcoal-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-6 sm:px-8">{children}</div>
}

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeRouteFor } from '../lib/routing'
import type { Role } from '../types'
import { Logo } from './ui'

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream">
      <div className="flex flex-col items-center gap-4">
        <Logo withSubline />
        <span
          aria-label="Loading"
          className="h-5 w-5 animate-spin rounded-full border-2 border-sage-400 border-t-transparent"
        />
      </div>
    </div>
  )
}

/** Requires a signed-in user. Otherwise bounces to login, preserving intended destination. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/**
 * Requires the signed-in user to hold one of `roles`. A mismatched role is redirected to its
 * own home route — never shown another role's surface. This is the RBAC gate (checklist §3):
 * authorization is decided from the server-trusted profile, not from any client claim.
 */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!profile) return <Navigate to="/login" replace />
  if (!roles.includes(profile.role)) {
    return <Navigate to={homeRouteFor(profile)} replace />
  }
  return <Outlet />
}

/**
 * Gate for approved + onboarded users only (the real app surface). Pending users go to their
 * holding page; approved-but-unfinished users go to their wizard.
 */
export function RequireApprovedAndOnboarded() {
  const { profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== 'admin' && (!profile.approved || !profile.wizardComplete)) {
    return <Navigate to={homeRouteFor(profile)} replace />
  }
  return <Outlet />
}

export { FullScreenLoader }

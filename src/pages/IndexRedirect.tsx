import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeRouteFor } from '../lib/routing'
import { FullScreenLoader } from '../components/RouteGuards'

/**
 * Root "/" resolver. Signed-in users land on their correct home; signed-out users go to login.
 * In Phase 3 this is replaced by the public marketing homepage for signed-out visitors.
 */
export function IndexRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user || !profile) return <Navigate to="/login" replace />
  return <Navigate to={homeRouteFor(profile)} replace />
}

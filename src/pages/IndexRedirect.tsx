import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeRouteFor } from '../lib/routing'
import { FullScreenLoader } from '../components/RouteGuards'
import { HomePage } from './public/HomePage'

/**
 * Root "/" resolver. Signed-in users are routed to their correct home; signed-out visitors
 * see the public marketing homepage.
 */
export function IndexRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user && profile) return <Navigate to={homeRouteFor(profile)} replace />
  return <HomePage />
}

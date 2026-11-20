import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import { Logo, Button, Card } from '../../components/ui'
import { useSpringIn } from '../../lib/motion'

/**
 * Sitter "holding" page at /nanny/setup's old gateway. Under the listing-service model (D77)
 * Little Lamb does not approve or interview sitters, so there is no review/interview tracker and
 * no approval gate — a new sitter is active the moment they sign up and comes straight here on
 * their way to the setup wizard. This page is now just a warm welcome into profile setup.
 * (A legacy/deactivated account would be routed to /nanny/declined by homeRouteFor, not here.)
 */
export function NannyHoldingPage() {
  const { profile } = useAuth()
  const springIn = useSpringIn()
  const firstName = profile?.fullName?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-ll-cream">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
      </header>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="eyebrow font-mono text-ll-sage-deep">Welcome to Little Lamb</p>
        <h1 className="mt-2 text-display-md">You’re in, {firstName} — let’s build your profile</h1>
        <p className="mt-3 text-ll-warm-gray">
          Build your profile so Santa Barbara families can find you: a photo, a short bio, your
          badges, and the hours you want to work. You can stop and come back any time — progress
          is saved.
        </p>
        <motion.div className="mt-8" {...springIn}>
          <Card>
            <h2 className="font-display text-display-sm">One more step</h2>
            <p className="mt-1 text-sm text-ll-warm-gray">
              Families see your profile before they book, so this is worth a few minutes.
            </p>
            <Link to="/nanny/setup">
              <Button className="mt-4">Continue to your profile</Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}

// Shown to an account that an admin has removed or deactivated.
//
// Under the listing-service model (D77) Little Lamb does not review or decline applications —
// everyone self-activates at signup. The only way an account reaches this page is admin
// remove/deactivate (status 'rejected'/'inactive'), the Terms-enforcement lever. homeRouteFor
// branches on status FIRST, so a removed account lands here rather than on a holding page that
// promises access that isn't coming.
//
// This page states the removal plainly and gives a human to reach. It deliberately does NOT
// offer "Complete your profile" — inviting someone into a wizard they can never finish is a
// failure in a different costume.
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import { Logo, Button, Card } from '../../components/ui'
import { useSpringIn } from '../../lib/motion'

const CONTACT = 'hello@littlelambnannies.com'

// `role` is still passed by both routes (family/nanny) but the copy no longer differs by role —
// removal is removal. Kept in the signature for the route API; prefixed to satisfy lint.
export function DeclinedPage({ role: _role }: { role: 'family' | 'nanny' }) {
  const { profile } = useAuth()
  const springIn = useSpringIn()
  // Deactivated is not the same as declined, and saying the wrong one is its own small insult.
  const deactivated = profile?.status === 'inactive'
  const firstName = profile?.fullName?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-ll-paper">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
      </header>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="eyebrow font-mono text-ll-warm-gray">Account closed</p>
        <h1 className="mt-2 text-display-md">
          {deactivated
            ? `${firstName}, your Little Lamb account is closed`
            : `${firstName}, your Little Lamb account has been removed`}
        </h1>
        <p className="mt-3 text-ll-warm-gray">
          {deactivated
            ? 'Your account is no longer active, so bookings and your profile are turned off.'
            : 'Your account has been removed from Little Lamb under our Terms of Service, so bookings and your profile are turned off. If you think this was a mistake, get in touch below.'}
        </p>
        <motion.div className="mt-8" {...springIn}>
          <Card>
            <h2 className="font-display text-display-sm">If you think this is a mistake</h2>
            <p className="mt-1 text-sm text-ll-warm-gray">
              We’d rather hear from you than have you wonder. Lucy and David read this inbox
              themselves.
            </p>
            <a
              className="mt-4 inline-block font-semibold text-ll-sage-deep underline underline-offset-4"
              href={`mailto:${CONTACT}?subject=${encodeURIComponent('About my Little Lamb application')}`}
            >
              Contact us at {CONTACT}
            </a>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}

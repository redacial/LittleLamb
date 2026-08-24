import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import { Logo, Button, Card } from '../../components/ui'
import { useSpringIn } from '../../lib/motion'

export function FamilyHoldingPage() {
  const { profile } = useAuth()
  const springIn = useSpringIn()

  // AuthContext holds a LIVE onSnapshot on the user doc, so this flips the instant an admin
  // approves — no refresh, no re-login. Consuming it matters more than it looks: platform
  // email is not live yet, so without this the family sits on "we're reviewing your
  // application" forever with nothing anywhere telling them the answer arrived.
  const approved = profile?.approved === true
  const firstName = profile?.fullName?.split(' ')[0] ?? 'there'

  if (approved) {
    return (
      <main className="min-h-screen bg-ll-cream">
        <header className="flex items-center justify-between px-6 py-4">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
        </header>
        <div className="mx-auto max-w-xl px-6 py-12">
          <p className="eyebrow font-mono text-ll-sage-deep">Application approved</p>
          <h1 className="mt-2 text-display-md">You’re approved, {firstName} — welcome to Little Lamb</h1>
          <p className="mt-3 text-ll-warm-gray">
            Lucy and David reviewed your application personally. Set up your family profile and
            you can start booking.
          </p>
          <motion.div className="mt-8" {...springIn}>
            <Card>
              <h2 className="font-display text-display-sm">One more step</h2>
              <p className="mt-1 text-sm text-ll-warm-gray">
                Tell us about your children, your home, and how to reach you. It takes a few
                minutes and you can stop and come back.
              </p>
              <Link to="/family/setup">
                <Button className="mt-4">Continue to your profile</Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ll-cream">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
      </header>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="eyebrow font-mono text-ll-peri-deep">Application received</p>
        <h1 className="mt-2 text-display-md">
          Thanks, {profile?.fullName?.split(' ')[0] ?? 'there'} — we’re reviewing your application
        </h1>
        <p className="mt-3 text-ll-warm-gray">
          We personally review every family before opening the platform. We’ll email you the moment
          you’re approved, and you’ll pick up right where you leave off.
        </p>
        <motion.div className="mt-8" {...springIn}>
          <Card>
            <h2 className="font-display text-display-sm">Want a head start?</h2>
            <p className="mt-1 text-sm text-ll-warm-gray">
              Complete your profile now so you’re ready to book the moment you’re approved. Your
              progress is saved.
            </p>
            <Link to="/family/setup">
              <Button className="mt-4">Complete your profile</Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}

// Shown to an applicant whose application was declined, or whose account was deactivated.
//
// WHY THIS EXISTS. homeRouteFor used to branch only on `approved`, and a rejected account is
// also `approved: false` — so a declined applicant landed on the pending holding page, which
// reads "We'll email you the moment you're approved." That was false for them, and the
// rejection email that was meant to correct it cannot send while platform email is dark. The
// result was a family Lucy had declined checking back indefinitely, then calling to ask why it
// was taking so long.
//
// So this page states the decision plainly and gives a human to reach, because there is no
// automated message coming. It deliberately does NOT offer "Complete your profile" — inviting
// someone into a wizard they can never finish is the same failure in a different costume.
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import { Logo, Button, Card } from '../../components/ui'
import { useSpringIn } from '../../lib/motion'

const CONTACT = 'hello@littlelambnannies.com'

export function DeclinedPage({ role }: { role: 'family' | 'nanny' }) {
  const { profile } = useAuth()
  const springIn = useSpringIn()
  // Deactivated is not the same as declined, and saying the wrong one is its own small insult.
  const deactivated = profile?.status === 'inactive'
  const firstName = profile?.fullName?.split(' ')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-ll-cream">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
      </header>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="eyebrow font-mono text-ll-warm-gray">
          {deactivated ? 'Account closed' : 'Application update'}
        </p>
        <h1 className="mt-2 text-display-md">
          {deactivated
            ? `${firstName}, your Little Lamb account is closed`
            : `Thanks for applying, ${firstName} — we’re not moving forward`}
        </h1>
        <p className="mt-3 text-ll-warm-gray">
          {deactivated
            ? 'Your account is no longer active, so bookings and profiles are turned off.'
            : role === 'nanny'
              ? 'We reviewed your application and aren’t able to add you to the network right now. That decision is about fit and timing in Santa Barbara, and it isn’t a judgement of your work.'
              : 'We reviewed your application and aren’t able to open the platform to your family right now. We keep the network small so every match gets real attention.'}
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

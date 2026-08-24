import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useCalendlyConfig } from '../../hooks/useAdmin'
import { signOut } from '../../lib/auth'
import { Logo, Button, Card } from '../../components/ui'
import { useSpringIn } from '../../lib/motion'
import { cn } from '../../lib/cn'
import type { NannyStage } from '../../types'

const STAGES: { key: NannyStage; label: string }[] = [
  { key: 'application_received', label: 'Application received' },
  { key: 'under_review', label: 'Under review' },
  { key: 'interview_scheduled', label: 'Interview scheduled' },
  { key: 'decision_made', label: 'Decision made' },
]

export function NannyHoldingPage() {
  const { profile } = useAuth()
  const stage = profile?.stage ?? 'application_received'
  const currentIndex = STAGES.findIndex((s) => s.key === stage)
  const springIn = useSpringIn()
  // Admin-configured in Settings > Calendly. Empty until Lucy sets it — see below.
  const { config: calendly } = useCalendlyConfig()
  const calendlyUrl = calendly.url.trim()

  // Live from AuthContext's onSnapshot — flips the moment an admin approves, with no refresh
  // and no re-login. Without this the nanny keeps staring at a review tracker that has already
  // finished, and platform email cannot tell her otherwise yet.
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
          <h1 className="mt-2 text-display-md">You’re approved, {firstName} — welcome to the network</h1>
          <p className="mt-3 text-ll-warm-gray">
            Build your profile so Santa Barbara families can find you: a photo, a short bio, your
            badges, and the hours you want to work.
          </p>
          <motion.div className="mt-8" {...springIn}>
            <Card>
              <h2 className="font-display text-display-sm">One more step</h2>
              <p className="mt-1 text-sm text-ll-warm-gray">
                Families see your profile before they book, so this is worth a few minutes. You
                can stop and come back.
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

  return (
    <main className="min-h-screen bg-ll-cream">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
      </header>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="eyebrow font-mono text-ll-peri-deep">Your application</p>
        <h1 className="mt-2 text-display-md">
          We’ve got your application, {profile?.fullName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-3 text-ll-warm-gray">
          Here’s where you are in our review. We’ll email you at each step.
        </p>

        <motion.div className="mt-8" {...springIn}>
          <Card tone="peri">
            <ol className="space-y-4">
              {STAGES.map((s, i) => {
                const done = i < currentIndex
                const active = i === currentIndex
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid h-7 w-7 place-items-center rounded-full font-mono text-xs font-bold border-1.5',
                        done && 'bg-ll-peri-deep text-white border-ll-peri-deep',
                        active && 'bg-white text-ll-peri-ink border-ll-peri',
                        !done && !active && 'bg-ll-cream-dark text-ll-warm-gray border-ll-peri-soft',
                      )}
                    >
                      {done ? (
                        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 8.5l3.5 3.5L13 4" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        active ? 'font-display text-display-sm text-ll-peri-ink' : 'font-semibold text-ll-warm-gray',
                      )}
                    >
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ol>

            {/*
              Only rendered when a link is actually configured. This CTA used to point at a
              hardcoded URL that 404s, so the nanny's one action at the most important step
              of the funnel was a dead link — worse than no button, because she clicks it,
              lands on an error, and concludes the platform is broken. With nothing
              configured we say nothing and let the "we'll email you" copy above stand.
            */}
            {stage === 'interview_scheduled' && calendlyUrl && (
              <a href={calendlyUrl} target="_blank" rel="noreferrer">
                <Button className="mt-5">Book your interview slot</Button>
              </a>
            )}
          </Card>
        </motion.div>

        <Card className="mt-6">
          <h2 className="font-display text-display-sm">Get a head start</h2>
          <p className="mt-1 text-sm text-ll-warm-gray">
            Build your profile now — photo, bio, video, and availability — so you’re live the
            instant you’re approved. Progress is saved.
          </p>
          <Link to="/nanny/setup">
            <Button className="mt-4">Complete your profile</Button>
          </Link>
        </Card>
      </div>
    </main>
  )
}

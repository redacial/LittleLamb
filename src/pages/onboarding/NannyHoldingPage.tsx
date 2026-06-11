import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
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

// Configured in admin Settings (Calendly is a documented open item). Placeholder until set.
const CALENDLY_URL = 'https://calendly.com/littlelamb/interview'

export function NannyHoldingPage() {
  const { profile } = useAuth()
  const stage = profile?.stage ?? 'application_received'
  const currentIndex = STAGES.findIndex((s) => s.key === stage)
  const springIn = useSpringIn()

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
                        done && 'bg-ll-peri text-white border-ll-peri',
                        active && 'bg-white text-ll-peri-deep border-ll-peri',
                        !done && !active && 'bg-ll-cream-dark text-ll-warm-gray border-ll-peri-soft',
                      )}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span
                      className={cn(
                        active ? 'font-display text-display-sm text-ll-peri-deep' : 'font-semibold text-ll-warm-gray',
                      )}
                    >
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ol>

            {stage === 'interview_scheduled' && (
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer">
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
